# main.py
from fastapi import FastAPI
from app.database import engine, Base
from app.routers import auth, resume

# Создаём таблицы
Base.metadata.create_all(engine)

app = FastAPI()

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(resume.router)