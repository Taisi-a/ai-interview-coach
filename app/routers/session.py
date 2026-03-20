# routers/session.py
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Session, Message, Resume, AgentType, SessionStatus, RoadmapItem, RoadmapStatus, Goal
from app.security import get_current_user
from app.config import VLLM_BASE_URL, get_model_for_agent
from app.llm_utils import strip_think_tags
from app.rag.settings import RAG_ENABLED, RAG_TOP_K, RAG_MAX_CONTEXT_CHARS
from app.rag.vectorstore import query_text

router = APIRouter(prefix="/session")


# --- Промты для каждого агента ---
AGENT_PROMPTS = {
    AgentType.HR: "Ты опытный HR. Проводишь поведенческое интервью. Задавай вопросы по методу STAR. После каждого ответа давай короткую обратную связь. Всегда задавай вопросы, не уходи от темы",
    AgentType.TECH_LEAD: "Ты опытный Tech Lead. Проводишь техническое интервью. Задаешь вопросы по алгоритмам, структурам данных и System Design. Сначала даешь 1–2 задачи уровня LeetCode, потом переходишь к вопросам на обсуждение. После каждого ответа кандидата: (1) кратко оцени корректность, (2) укажи что не так/чего не хватает, (3) задай следующий вопрос. Используй предоставленный контекст из Tech Interview Handbook (RAG), чтобы сверять ответы и предлагать темы для изучения. Задавай по 1 вопросу за сообщение.",
    AgentType.MENTOR: "Ты карьерный ментор. На основе резюме кандидата и текста вакансии выявляй сильные стороны и пробелы. Используй предоставленный контекст из Tech Interview Handbook (RAG) и предложи список тем для изучения с приоритетами и коротким планом. Активно поддерживай диалог и задавай вопросы",
    AgentType.CODE_REVIEW: "Ты senior разработчик. Делаешь code review. Анализируй код на корректность, сложность и стиль. Задавай уточняющие вопросы",
}

OPENING_MESSAGES = {
    AgentType.HR: "Привет! Я проведу поведенческую часть интервью. Расскажите немного о себе и своём опыте.",
    AgentType.TECH_LEAD: "Привет! Начнём техническое интервью. Какой у тебя основной язык программирования?",
    AgentType.MENTOR: "Привет! Я твой карьерный ментор. Расскажи на какую позицию готовишься и что уже умеешь?",
    AgentType.CODE_REVIEW: "Привет! Готов к code review. Вставь свой код и я дам обратную связь.",
}


# --- Схемы ---

class SessionCreate(BaseModel):
    agent_type: AgentType
    resume_id: int | None = None
    vacancy_text: str | None = None
    goal_id: int | None = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: int
    agent_type: AgentType
    status: SessionStatus
    messages: list[MessageOut] = []
    model_config = {"from_attributes": True}


class UserMessage(BaseModel):
    content: str


# --- Эндпоинты ---

@router.post("/", response_model=SessionOut, status_code=201)
def create_session(
    payload: SessionCreate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if payload.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == payload.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Резюме не найдено")

    goal = None
    if payload.goal_id:
        goal = db.query(Goal).filter(
            Goal.id == payload.goal_id,
            Goal.user_id == current_user.id,
        ).first()
        if not goal:
            raise HTTPException(status_code=404, detail="Цель не найдена")

    session = Session(
        user_id=current_user.id,
        resume_id=payload.resume_id or (goal.resume_id if goal else None),
        goal_id=payload.goal_id,
        agent_type=payload.agent_type,
        vacancy_text=payload.vacancy_text or (goal.vacancy_text if goal else None),
    )
    db.add(session)
    db.flush()

    opening = Message(
        session_id=session.id,
        role="assistant",
        content=OPENING_MESSAGES[payload.agent_type],
    )
    db.add(opening)
    db.flush()
    db.refresh(session)
    return session


@router.post("/{session_id}/message", response_model=MessageOut)
def send_message(
    session_id: int,
    payload: UserMessage,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Сессия завершена")

    user_msg = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_msg)
    db.flush()

    reply_text = _get_agent_reply(session, db)

    agent_msg = Message(session_id=session.id, role="assistant", content=reply_text)
    db.add(agent_msg)
    db.flush()

    db.refresh(agent_msg)
    return agent_msg


@router.post("/{session_id}/save_roadmap")
def save_roadmap(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Сканирует все сообщения Ментора, ищет раздел с планом и сохраняет пункты.
    Возвращает added + debug-информацию для диагностики.
    """
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    if session.agent_type != AgentType.MENTOR:
        raise HTTPException(status_code=400, detail="Только Ментор создаёт roadmap")

    # Ищем раздел с планом во всех сообщениях ментора, начиная с последнего
    mentor_messages = [m.content for m in reversed(session.messages) if m.role == "assistant"]
    if not mentor_messages:
        raise HTTPException(status_code=400, detail="Нет сообщений от ментора")

    # Перебираем сообщения от последнего к первому, берём первое где найден раздел
    target_text = None
    plan_section_preview = None
    for msg in mentor_messages:
        section = _find_plan_section(msg)
        if section:
            items_preview = _extract_plan_items(section)
            if items_preview:
                target_text = msg
                plan_section_preview = section[:200]
                break

    # Если ни в одном сообщении не нашли — берём последнее и пробуем всё равно
    if target_text is None:
        target_text = mentor_messages[0]

    added = _save_roadmap_items(target_text, current_user.id, session.goal_id, db)

    # Debug: что нашёл парсер
    debug_section = _find_plan_section(target_text)
    debug_items = _extract_plan_items(debug_section) if debug_section else []

    return {
        "added": added,
        "debug": {
            "plan_section_found": debug_section is not None,
            "plan_section_preview": (debug_section or "")[:300],
            "items_found": [title for title, _ in debug_items],
        }
    }


@router.get("/{session_id}", response_model=SessionOut)
def get_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    return session


@router.get("/", response_model=list[SessionOut])
def get_sessions(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(Session).filter(Session.user_id == current_user.id).all()


@router.patch("/{session_id}/complete", response_model=SessionOut)
def complete_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    session.status = SessionStatus.COMPLETED
    db.flush()
    db.refresh(session)
    return session


# ---------------------------------------------------------------------------
# Парсинг roadmap из ответа Ментора
# ---------------------------------------------------------------------------

# Ключевые слова для поиска строки-заголовка раздела с планом
_PLAN_SECTION_KEYWORDS = [
    "план обучения", "план изучения", "план подготовки", "приоритетный план",
    "план действий", "что изучить", "темы для изучения", "рекомендации по изучению",
    "learning plan", "study plan", "roadmap",
]

_PLAN_LINE_RE = re.compile(r'план\s+\w', re.IGNORECASE)


def _strip_line_markup(line: str) -> str:
    """Убирает markdown и эмодзи из строки для сравнения с ключевыми словами."""
    s = re.sub(r'[#*_`]', '', line)
    s = re.sub(r'[\U0001F300-\U0001FFFF\U00002600-\U000027FF]', '', s)
    return s.strip().lower()


def _clean_title(raw: str) -> str:
    """Убирает markdown-разметку из заголовка."""
    title = re.sub(r'\*{1,3}|_{1,3}|`', '', raw)
    title = re.sub(r'\s+', ' ', title).strip()
    title = title.rstrip(':').strip()
    return title


def _find_plan_section(text: str) -> str | None:
    """
    Ищет раздел с планом подготовки в тексте ответа ментора.

    Алгоритм (построчный — не зависит от конкретного markdown-форматирования):
    1. Проходим строки, ищем любую строку, содержащую ключевые слова плана
       после зачистки от markdown и эмодзи.
    2. От найденной строки собираем текст до следующего «раздела» — строки
       без отступа с эмодзи-маркером или жирным заголовком, не являющейся
       нумерованным пунктом плана.
    3. Если раздел не найден — возвращаем None.
    """
    lines = text.split('\n')
    plan_start = None

    for i, line in enumerate(lines):
        # Пропускаем вложенные пункты (отступ ≥ 2 пробелов или таб)
        if re.match(r'^[ \t]{2,}', line):
            continue
        clean = _strip_line_markup(line)
        if not clean:
            continue
        if any(kw in clean for kw in _PLAN_SECTION_KEYWORDS) or _PLAN_LINE_RE.search(clean):
            plan_start = i
            break

    if plan_start is None:
        return None

    # Паттерн «большого» заголовка другого раздела (не нумерованного пункта плана)
    other_section_re = re.compile(
        r'^(?:'
        r'#{1,3}\s+'                                        # ## Заголовок
        r'|(?:[\U0001F300-\U0001FFFF\U00002600-\U000027FF])'  # строка начинается с эмодзи
        r'|(?:\*{2}[^*]+\*{2}\s*$)'                        # **Жирный заголовок**
        r'|(?:📌|✅|🔍|❓|🧩|💡|⚠|🚫|🎯|📚)'              # типичные эмодзи других разделов
        r')'
    )

    section_lines = []
    for idx, line in enumerate(lines[plan_start:], start=plan_start):
        # Останавливаемся на следующем большом разделе (не на первой же строке)
        if idx > plan_start and other_section_re.match(line):
            break
        section_lines.append(line)

    return '\n'.join(section_lines).strip() or None


def _extract_plan_items(plan_text: str) -> list[tuple[str, str]]:
    """
    Из текста раздела плана извлекает нумерованные пункты.

    Поддерживаемые форматы заголовков пункта:
      1. FastAPI + Асинхронность (4–5 часов)
      1. **FastAPI + Асинхронность**
      #### **1. FastAPI + Асинхронность (4–5 часов)**
      ### 1. FastAPI + Асинхронность
      **1. FastAPI + Асинхронность**
    """
    item_re = re.compile(
        r'^'
        r'(?:#{1,6}\s*)?'            # опциональные # (любое кол-во, включая ####)
        r'(?:\*{1,2}|_{1,2})?'       # опциональный bold-open
        r'(\d+)[\.\)]\s*'            # ЦИФРА + точка/скобка  ← главный маркер
        r'(?:\*{1,2}|_{1,2})?'       # опциональный bold после цифры
        r'(.+?)'                      # заголовок пункта
        r'(?:\*{1,2}|_{1,2})?'       # опциональный bold-close
        r'\s*:?\s*$',                 # опциональное двоеточие
        re.MULTILINE
    )

    matches = list(item_re.finditer(plan_text))
    if not matches:
        return []

    items = []
    for i, m in enumerate(matches):
        raw_title = m.group(2).strip()
        title = _clean_title(raw_title)

        if len(title) < 3:
            continue

        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(plan_text)
        body = plan_text[body_start:body_end].strip()

        items.append((title, body))

    return items


def _save_roadmap_items(text: str, user_id: int, goal_id: int | None, db: DBSession) -> int:
    """
    Парсит ответ Ментора и сохраняет пункты плана в roadmap_items.

    Логика:
    1. Находим раздел с планом по ключевым словам.
    2. Внутри раздела ищем нумерованные пункты (1. FastAPI..., 2. Базы данных...).
    3. Заголовок пункта → title карточки, весь текст пункта → description.
    4. Дубликаты по title (case-insensitive) пропускаются.
    """
    plan_section = _find_plan_section(text)

    if plan_section:
        sections = _extract_plan_items(plan_section)
    else:
        # Нет явного раздела — ищем нумерованные пункты во всём тексте
        sections = _extract_plan_items(text)

    if not sections:
        return 0

    existing_titles = {
        row.title.strip().lower()
        for row in db.query(RoadmapItem.title).filter(
            RoadmapItem.user_id == user_id
        ).all()
    }

    last_order = db.query(RoadmapItem).filter(
        RoadmapItem.user_id == user_id
    ).count()

    added = 0
    for title, description in sections:
        if title.lower() in existing_titles:
            continue
        if len(title) > 200:
            continue

        db.add(RoadmapItem(
            user_id=user_id,
            goal_id=goal_id,
            title=title,
            description=description if description else None,
            status=RoadmapStatus.TODO,
            order=last_order + added,
        ))
        existing_titles.add(title.lower())
        added += 1

    if added:
        db.flush()
    return added


# ---------------------------------------------------------------------------
# Вызов LLM
# ---------------------------------------------------------------------------

def _get_agent_reply(session: Session, db: DBSession) -> str:
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages
    ]

    system_prompt = AGENT_PROMPTS[session.agent_type]
    if session.resume:
        system_prompt += f"\n\nРЕЗЮМЕ КАНДИДАТА:\n{session.resume.raw_text[:3000]}"
    if session.vacancy_text:
        system_prompt += f"\n\nВАКАНСИЯ:\n{session.vacancy_text[:1000]}"

    if RAG_ENABLED:
        last_user = next((m["content"] for m in reversed(history) if m["role"] == "user"), "")
        rag_query = last_user
        if session.vacancy_text:
            rag_query += f"\n\nVacancy:\n{session.vacancy_text[:800]}"
        if session.resume:
            rag_query += f"\n\nResume:\n{session.resume.raw_text[:1200]}"

        try:
            hits = query_text(rag_query, top_k=RAG_TOP_K)
        except Exception:
            hits = []

        if hits:
            context_lines: list[str] = []
            total = 0
            for i, h in enumerate(hits, start=1):
                meta = h.get("meta") or {}
                src = meta.get("source") or "unknown"
                title = meta.get("title")
                header = f"[{i}] {title + ' — ' if title else ''}{src}"
                snippet = (h.get("text") or "").strip()
                block = f"{header}\n{snippet}"
                if total + len(block) > RAG_MAX_CONTEXT_CHARS:
                    break
                context_lines.append(block)
                total += len(block) + 2

            system_prompt += "\n\nTECH INTERVIEW HANDBOOK (RAG):\n" + "\n\n".join(context_lines)

    from openai import OpenAI

    model = get_model_for_agent(session.agent_type.value)
    client = OpenAI(api_key="not-needed", base_url=VLLM_BASE_URL)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system_prompt}] + history,
        max_tokens=10000,
        temperature=0.7,
    )
    raw = response.choices[0].message.content or ""
    return strip_think_tags(raw)