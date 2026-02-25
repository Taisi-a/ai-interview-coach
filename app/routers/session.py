# routers/session.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Session, Message, Resume, AgentType, SessionStatus
from app.security import get_current_user

router = APIRouter(prefix="/session")


# --- Промты для каждого агента ---
AGENT_PROMPTS = {
    AgentType.HR: "Ты опытный HR. Проводишь поведенческое интервью. Задавай вопросы по методу STAR. После каждого ответа давай короткую обратную связь.",
    AgentType.TECH_LEAD: "Ты опытный Tech Lead. Проводишь техническое интервью. Задавай вопросы по алгоритмам, структурам данных и System Design.",
    AgentType.MENTOR: "Ты карьерный ментор. Анализируй резюме кандидата, выявляй пробелы и составляй план подготовки.",
    AgentType.CODE_REVIEW: "Ты senior разработчик. Делаешь code review. Анализируй код на корректность, сложность и стиль.",
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
    resume_id: int | None = None    # опционально
    vacancy_text: str | None = None # опционально


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
    # Проверяем резюме если передано
    if payload.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == payload.resume_id,
            Resume.user_id == current_user.id
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Резюме не найдено")

    # Создаём сессию
    session = Session(
        user_id=current_user.id,
        resume_id=payload.resume_id,
        agent_type=payload.agent_type,
        vacancy_text=payload.vacancy_text,
    )
    db.add(session)
    db.flush()

    # Первое сообщение от агента
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
    # Находим сессию
    session = db.query(Session).filter(
        Session.id == session_id,
        Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    if session.status == SessionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Сессия завершена")

    # Сохраняем сообщение юзера
    user_msg = Message(
        session_id=session.id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    db.flush()

    # Получаем ответ от агента
    reply_text = _get_agent_reply(session, db)

    # Сохраняем ответ агента
    agent_msg = Message(
        session_id=session.id,
        role="assistant",
        content=reply_text,
    )
    db.add(agent_msg)
    db.flush()
    db.refresh(agent_msg)
    return agent_msg


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


# --- Вызов LLM ---

def _get_agent_reply(session: Session, db: DBSession) -> str:
    """
    Собирает историю чата и отправляет в LLM.
    Сейчас заглушка — когда vllm будет готов, раскомментировать блок.
    """

    # Собираем историю сообщений
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in session.messages
    ]

    # Добавляем контекст резюме если есть
    system_prompt = AGENT_PROMPTS[session.agent_type]
    if session.resume:
        system_prompt += f"\n\nРЕЗЮМЕ КАНДИДАТА:\n{session.resume.raw_text[:3000]}"
    if session.vacancy_text:
        system_prompt += f"\n\nВАКАНСИЯ:\n{session.vacancy_text[:1000]}"


    # from openai import OpenAI
    # client = OpenAI(api_key="not-needed", base_url="http://АДРЕС/v1")
    # response = client.chat.completions.create(
    #     model="UI-TARS-1.5-7B",
    #     messages=[{"role": "system", "content": system_prompt}] + history,
    #     max_tokens=512,
    #     temperature=0.7,
    # )
    # return response.choices[0].message.content

    return f"[Заглушка агента {session.agent_type.value}] Получил твоё сообщение. Подключим vllm как будет готов!"