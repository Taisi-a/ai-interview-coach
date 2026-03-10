# 🎯 AI Career Interview Coach

Интеллектуальная система подготовки к техническим интервью с использованием LLM, RAG и мультиагентной архитектуры.

## 💡 Что это такое

Персональный AI-ассистент который:
- Анализирует резюме кандидата и требования вакансии
- Выявляет сильные стороны и пробелы в знаниях
- Формирует персональный план подготовки (roadmap)
- Проводит симуляцию интервью через мультиагентную систему:
  - **HR-агент** — поведенческие вопросы, оценка soft skills
  - **Tech Lead агент** — алгоритмы, структуры данных, System Design
  - **Mentor-агент** — анализ слабых сторон, рекомендации
  - **Code Review агент** — разбор кода кандидата

---

## 🗂 Структура проекта

```
ai-interview-coach/
│
├── app/
│   ├── __init__.py
│   ├── main.py                  # Точка входа, CORS, роутеры
│   ├── database.py              # Подключение к PostgreSQL
│   ├── models.py                # Таблицы: User, Resume, Session, Message, BlacklistedToken
│   ├── schemas.py               # Pydantic схемы
│   ├── security.py              # JWT, bcrypt, проверка blacklist
│   ├── config.py                # Переменные из .env
│   │
│   └── routers/
│       ├── __init__.py
│       ├── auth.py              # /register /login /logout /me
│       ├── resume.py            # /resume/upload /resume/ /resume/{id}
│       ├── session.py           # /session/ и чат
│       ├── chat.py              # /chat/completions
│       └── vacancy.py          # /vacancy/{id}
│
├── frontend/                    # React (фронтенд)
│
├── scripts/
│   └── start_llm.sh             # Запуск llama.cpp + Qwen3
│
├── tech-interview-handbook-main/ # База знаний для RAG
├── models/                       # Файлы LLM (не в git)
│
├── docker-compose.yaml
├── Dockerfile
├── .env                          # Не в git!
├── .env.example
├── .gitignore
└── README.md
```
---

## ⚙️ Технологии

| Слой | Технология |
|------|-----------|
| Бэкенд | Python 3.9+, FastAPI |
| База данных | PostgreSQL 16 |
| ORM | SQLAlchemy |
| Авторизация | JWT (python-jose) + blacklist |
| Хеширование паролей | bcrypt (passlib) |
| Парсинг файлов | pypdf, python-docx |
| LLM | llama.cpp + Qwen3-8B |
| AI / RAG | LangChain |
| Вакансии | hh.ru API |
| Фронтенд | React.js |
| Инфраструктура | Docker, Docker Compose |

---

## 🚀 Запуск проекта


Ниже — полная последовательность: venv, пакеты, конфиг, запуск модели и приложения в контейнерах.

#### 1. Клонирование и переход в проект

```bash
git clone https://github.com/ВАШ_ЛОГИН/ai-interview-coach.git
cd ai-interview-coach
```

#### 2. Виртуальное окружение (venv)

```bash
python3 -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

Дальнейшие команды предполагают, что venv активирован (`source .venv/bin/activate`).

#### 3. Пакеты для разработки

Установи зависимости бэкенда (FastAPI, БД, RAG, скрипты):

```bash
pip install -r requirements.txt
```

```bash
pip install -r requirements-llm.txt
```

#### 4. Конфигурация (.env)

```bash
cp .env.example .env
```

Отредактируй `.env`: задай `DATABASE_URL` (если будешь поднимать БД через Docker — там уже подставятся переменные из compose), `SECRET_KEY`, при необходимости `VLLM_BASE_URL` и параметры RAG. Для запуска API в Docker и LLM на хосте оставь в compose строку `VLLM_BASE_URL=http://host.docker.internal:8001/v1` (она уже прописана в `docker-compose.yaml`).

#### 5. Запуск модели (LLM на хосте)

В **отдельном терминале** с активированным venv:

```bash
source .venv/bin/activate   # если ещё не активирован
chmod +x scripts/start_llm.sh
./scripts/start_llm.sh
```

Скрипт при первом запуске скачает модель в `./models/` (если её ещё нет) и поднимет OpenAI-совместимый сервер на **http://localhost:8001**. Не закрывай этот терминал, пока нужен LLM.

#### 6. Запуск приложения из контейнера (API + фронт + БД)

В **другом терминале** из корня проекта:

```bash
docker compose up -d --build
```

- **API:** http://localhost:8080  
- **Swagger:** http://localhost:8080/docs  
- **Фронт:** http://localhost:5173  

Контейнер API подключается к LLM по `host.docker.internal:8001`.

#### 7. RAG

Один раз построить индекс по Tech Interview Handbook:

```bash
docker compose exec api python -m app.rag.build_index
```

---

### Полный путь запуска (кратко)

1. **venv + пакеты:** `python3 -m venv .venv && source .venv/bin/activate` → `pip install -r requirements.txt` (+ `requirements-llm.txt` для LLM).
2. **.env:** `cp .env.example .env` и при необходимости поправить переменные.
3. **LLM:** в одном терминале `./scripts/start_llm.sh`.
4. **Приложение:** в другом терминале `docker compose up -d --build`.
5. **RAG (по желанию):** `docker compose exec api python -m app.rag.build_index`.

---

### Запуск LLM (llama.cpp)

Модель Qwen3 отдаёт OpenAI-совместимый API на порту 8001. Контейнер с API обращается к нему по `host.docker.internal:8001`.

**Требования:** Python 3.10+, активированный venv и пакеты из `requirements-llm.txt`:

```bash
pip install -r requirements-llm.txt
```

Запуск (из корня проекта, с активированным venv):

```bash
chmod +x scripts/start_llm.sh
./scripts/start_llm.sh
```

Скрипт:
- создаёт каталог `./models`, если его нет;
- при отсутствии файла скачивает `Qwen/Qwen3-8B-GGUF` → `Qwen3-8B-Q4_K_M.gguf` в `./models`;
- запускает `llama_cpp.server` на порту **8001**.

Переменные окружения (опционально):
- `LLM_MODEL_DIR` — каталог с моделью (по умолчанию `./models`);
- `LLM_MODEL_FILE` — имя файла (по умолчанию `Qwen3-8B-Q4_K_M.gguf`);
- `LLM_PORT` — порт (по умолчанию `8001`);
- `LLM_HF_REPO` — репозиторий на Hugging Face (по умолчанию `Qwen/Qwen3-8B-GGUF`).

---

### База данных (для Docker)

PostgreSQL поднимается контейнером `postgres` из `docker compose`. Переменные `POSTGRES_*` и `DATABASE_URL` задаются в `.env` и в compose — отдельно создавать базу не нужно.

Если запускаешь только API локально (без Docker), создай БД вручную и укажи в `.env`:
```sql
CREATE USER coach WITH PASSWORD 'coach_secret';
CREATE DATABASE interview_coach OWNER coach;
```
```
DATABASE_URL=postgresql://coach:coach_secret@localhost:5432/interview_coach
SECRET_KEY=придумай-случайную-строку-минимум-32-символа
```

### Запуск API локально (без Docker)

Если хочешь запускать только бэкенд на хосте (uvicorn), без контейнеров:

```bash
source .venv/bin/activate
pip install -r requirements.txt
# Настрой .env и запусти PostgreSQL (локально или в контейнере)
uvicorn app.main:app --reload
```

Сервер: `http://localhost:8000`, Swagger: `http://localhost:8000/docs`. В `.env` укажи `VLLM_BASE_URL=http://localhost:8001/v1` и предварительно запусти LLM через `./scripts/start_llm.sh`.

---

## 📡 API эндпоинты

### 🔐 Авторизация

| Метод | URL | Описание | Токен |
|-------|-----|----------|-------|
| POST | `/register` | Регистрация | ❌ |
| POST | `/login` | Вход → JWT токен | ❌ |
| GET | `/me` | Текущий пользователь | ✅ |

### 📄 Резюме

| Метод | URL | Описание | Токен |
|-------|-----|----------|-------|
| POST | `/resume/upload` | Загрузить PDF или DOCX | ✅ |
| GET | `/resume/` | Список своих резюме | ✅ |
| GET | `/resume/{id}` | Конкретное резюме | ✅ |

### 🏢 Вакансии

| Метод | URL | Описание | Токен |
|-------|-----|----------|-------|
| GET | `/vacancy/{id}` | Получить вакансию с hh.ru по ID | ✅ |

### 💬 Сессии интервью

| Метод | URL | Описание | Токен |
|-------|-----|----------|-------|
| POST | `/session/` | Создать сессию, выбрать агента | ✅ |
| POST | `/session/{id}/message` | Отправить сообщение агенту | ✅ |
| GET | `/session/{id}` | История чата | ✅ |
| GET | `/session/` | Все свои сессии | ✅ |
| PATCH | `/session/{id}/complete` | Завершить сессию | ✅ |

### 🤖 LLM (OpenAI-совместимый интерфейс)

| Метод | URL | Описание | Токен |
|-------|-----|----------|-------|
| POST | `/chat/completions` | Запрос к LLM в OpenAI формате | ✅ |

**Пример запроса к `/chat/completions`:**
```json
{
  "model": "models/Qwen3-8B-Q4_K_M.gguf",
  "messages": [
    {"role": "system", "content": "Ты HR на интервью"},
    {"role": "user", "content": "Расскажи о себе"}
  ],
  "max_tokens": 2048,
  "temperature": 0.7
}
```

**Доступные агенты:**
```
hr           — поведенческое интервью
tech_lead    — техническое интервью
mentor       — анализ резюме и roadmap
code_review  — разбор кода
```


---

## 📚 RAG (Tech Interview Handbook)

В проекте есть RAG на базе датасета `tech-interview-handbook-main`: перед ответом агента система подмешивает релевантные фрагменты из Tech Interview Handbook, чтобы:
- проверять ответы кандидата по базе знаний;
- находить пробелы и предлагать темы для изучения (особенно для агента `mentor`).

### 1) Построить индекс (один раз)

Если API запущен в Docker:

```bash
docker compose exec api python -m app.rag.build_index
```

### 2) Включить/настроить RAG

Переменные окружения (см. `.env.example`):
- `RAG_ENABLED=true`
- `RAG_HANDBOOK_DIR=/app/tech-interview-handbook-main/apps/website`
- `RAG_PERSIST_DIR=/app/rag_store`
- `RAG_TOP_K=6`

### 3) Парсинг внешних ссылок из handbook (опционально)

В handbook много ссылок на LeetCode, статьи, курсы. Скрипт собирает все URL и может скачать текст со страниц:

```bash
# Только список ссылок в data/handbook_links.json
python scripts/fetch_handbook_links.py --handbook tech-interview-handbook-main/apps/website --out data/handbook_links.json

# Скачать текст по ссылкам в data/scraped_pages/ (с задержкой между запросами)
python scripts/fetch_handbook_links.py --handbook tech-interview-handbook-main/apps/website --out data/handbook_links.json --fetch --scraped-dir data/scraped_pages --delay 1
```

Учитывай: страницы LeetCode и многих курсов рендерятся через JS — скрипт получит в основном разметку, а не готовый текст. Статичные статьи (блоги, документация) обычно парсятся нормально. YouTube, LinkedIn и т.п. по умолчанию пропускаются (`--skip-domains`).

**Доступные агенты для `/session/`:**
```json
{
  "agent_type": "hr"           // поведенческое интервью
  "agent_type": "tech_lead"    // техническое интервью
  "agent_type": "mentor"       // анализ резюме и roadmap
  "agent_type": "code_review"  // разбор кода
}
```

---

## 🔑 Как работает авторизация

1. Регистрируешься через `POST /register`
2. Логинишься через `POST /login` — получаешь токен
3. Все защищённые запросы отправляешь с заголовком:
```
Authorization: Bearer <твой_токен>
```

В Swagger: кнопка `Authorize 🔒` вверху → поле `Value` → вставь токен

---

## 👥 Команда

| Роль | Задачи                                  |
|------|-----------------------------------------|
| Бэкенд | FastAPI, PostgreSQL, LLM интеграция     |
| Фронтенд | React интерфейс                         |
| AI/ML | LLM (vLLM), RAG, мультиагентная система |

---

