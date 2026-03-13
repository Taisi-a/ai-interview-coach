# models.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
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


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="resumes")
    sessions = relationship("Session", back_populates="resume")


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
    agent_type = Column(Enum(AgentType), nullable=False)
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE)
    vacancy_text = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    resume = relationship("Resume", back_populates="sessions")
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


# --- Новая таблица ---
class RoadmapStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)        # "Алгоритмы и структуры данных"
    description = Column(Text, nullable=True)          # подробнее что изучить
    status = Column(Enum(RoadmapStatus), default=RoadmapStatus.TODO)
    order = Column(Integer, default=0)                 # порядок отображения

    user = relationship("User", back_populates="roadmap_items")