# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, resume, chat, session, vacancy, roadmap, goal
from app.config import FRONTEND_URL

Base.metadata.create_all(engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(chat.router)
app.include_router(session.router)
app.include_router(vacancy.router)
app.include_router(roadmap.router)
app.include_router(goal.router)