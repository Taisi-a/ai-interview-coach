# main.py
from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, resume, chat, session

# Создаём таблицы
Base.metadata.create_all(engine)

app = FastAPI()

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(chat.router)
app.include_router(session.router)