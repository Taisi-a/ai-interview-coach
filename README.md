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
│   ├── main.py          # Точка входа, сборка приложения
│   ├── database.py      # Подключение к PostgreSQL
│   ├── models.py        # Таблицы БД: User, Resume, Session, Message
│   ├── schemas.py       # Pydantic схемы (User)
│   ├── security.py      # Хеширование паролей, JWT токены
│   └── routers/
│       ├── auth.py      # Авторизация
│       ├── resume.py    # Загрузка резюме
│       ├── session.py   # Сессии интервью и чат
│       └── chat.py      # OpenAI-совместимая ручка
│
├── .env                 # Локальные переменные 
├── .env.example         # Шаблон переменных для команды
├── .gitignore
└── README.md
```

---

## ⚙️ Технологии

| Слой | Технология |
|------|-----------|
| Бэкенд | Python 3.9+, FastAPI |
| База данных | PostgreSQL |
| ORM | SQLAlchemy |
| Авторизация | JWT (python-jose) |
| Хеширование паролей | bcrypt (passlib) |
| Парсинг файлов | pypdf, python-docx |
| LLM | vLLM, OpenAI-совместимый клиент  |
| AI / RAG | LangChain |
| Фронтенд | React.js  |

---

## 🚀 Запуск проекта

### Полный путь запуска (кратко)

1. **LLM (llama.cpp + Qwen3)** — в отдельном терминале, на хосте:
   ```bash
   ./scripts/start_llm.sh
   ```
   Сервер будет на `http://localhost:8001`. Подробности — в разделе [Запуск LLM (llama.cpp)](#запуск-llm-llamacpp) ниже.

2. **Приложение (API + фронт + БД)** — через Docker:
   ```bash
   docker compose up -d --build
   ```
   Фронт: `http://localhost:5173`, API: `http://localhost:8080`, Swagger: `http://localhost:8080/docs`.

3. **RAG (опционально)** — один раз построить индекс по Tech Interview Handbook:
   ```bash
   docker compose exec api python -m app.rag.build_index
   ```

---

### Запуск LLM (llama.cpp)

Модель Qwen3 отдаёт OpenAI-совместимый API на порту 8001. Контейнер с API обращается к нему по `host.docker.internal:8001`.

**Требования:** Python с пакетами `llama-cpp-python`, `huggingface-hub` (для скачивания модели).

```bash
# Из корня проекта
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

### 1. Клонируй репозиторий

```bash
git clone https://github.com/ВАШ_ЛОГИН/ai-interview-coach.git
cd ai-interview-coach
```

### 2. Создай виртуальное окружение

```bash
python -m venv .venv

# MacOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 3. Установи зависимости

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary \
            python-jose passlib bcrypt==4.0.1 \
            python-multipart email-validator \
            pypdf python-docx openai
```

### 4. Настрой базу данных

Убедись что PostgreSQL запущен. Создай базу и пользователя:

**Через pgAdmin4:**
- Login/Group Roles → Create → Name: `coach`, Password: `coach_secret`, Can login: ✅
- Databases → Create → Name: `interview_coach`, Owner: `coach`

**Или через psql:**
```sql
CREATE USER coach WITH PASSWORD 'coach_secret';
CREATE DATABASE interview_coach OWNER coach;
```

### 5. Создай файл `.env`

```bash
cp .env.example .env```

Содержимое `.env`:
```
DATABASE_URL=postgresql://coach:coach_secret@localhost:5432/interview_coach
SECRET_KEY=придумай-случайную-строку-минимум-32-символа
```

### 6. Запусти сервер

**Вариант A — через Docker (рекомендуется):**  
Сначала запусти LLM в отдельном терминале ([Запуск LLM (llama.cpp)](#запуск-llm-llamacpp)), затем:

```bash
docker compose up -d --build
```

API: `http://localhost:8080`, Swagger: `http://localhost:8080/docs`, фронт: `http://localhost:5173`.

**Вариант B — локально (uvicorn на хосте):**

```bash
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

