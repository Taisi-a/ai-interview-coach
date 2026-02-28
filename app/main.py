# main.py
from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, resume, chat, session
from fastapi.middleware.cors import CORSMiddleware
# Создаём таблицы
Base.metadata.create_all(engine)

app = FastAPI()

# CORS — разрешаем фронту стучаться в API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # адрес фронта из .env
    allow_credentials=True,
    allow_methods=["*"],           # разрешаем GET, POST, PATCH и т.д.
    allow_headers=["*"],           # разрешаем любые заголовки (включая Authorization)
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(chat.router)
app.include_router(session.router)