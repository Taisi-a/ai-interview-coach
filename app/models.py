# models.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    resumes = relationship("Resume", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    roadmap_items = relationship("RoadmapItem", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    saved_vacancies = relationship("SavedVacancy", back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="resumes")
    sessions = relationship("Session", back_populates="resume")
    goals = relationship("Goal", back_populates="resume")


class AgentType(str, enum.Enum):
    HR = "hr"
    TECH_LEAD = "tech_lead"
    MENTOR = "mentor"
    CODE_REVIEW = "code_review"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    agent_type = Column(Enum(AgentType), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE)
    vacancy_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    resume = relationship("Resume", back_populates="sessions")
    goal = relationship("Goal", back_populates="sessions")
    messages = relationship("Message", back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    session = relationship("Session", back_populates="messages")


class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"

    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, nullable=False)


class RoadmapStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    status = Column(Enum(RoadmapStatus), default=RoadmapStatus.TODO)
    order = Column(Integer, default=0)

    user = relationship("User", back_populates="roadmap_items")
    goal = relationship("Goal", back_populates="roadmap_items")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    vacancy_text = Column(Text, nullable=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="goals")
    resume = relationship("Resume", back_populates="goals")
    sessions = relationship("Session", back_populates="goal")
    roadmap_items = relationship("RoadmapItem", back_populates="goal")


class SavedVacancy(Base):
    __tablename__ = "saved_vacancies"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vacancy_id = Column(String, nullable=False)
    title = Column(String)
    company = Column(String)
    raw_json = Column(Text)

    user = relationship("User", back_populates="saved_vacancies")