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

```bash
uvicorn app.main:app --reload
```

Сервер: `http://localhost:8000`
Swagger: `http://localhost:8000/docs`

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
  "model": "UI-TARS-1.5-7B",
  "messages": [
    {"role": "system", "content": "Ты HR на интервью"},
    {"role": "user", "content": "Расскажи о себе"}
  ],
  "max_tokens": 512,
  "temperature": 0.7
}
```

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

