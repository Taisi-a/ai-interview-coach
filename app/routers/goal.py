# routers/goal.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models import Goal, RoadmapItem, RoadmapStatus, Resume
from app.security import get_current_user

router = APIRouter(prefix="/goal")


# --- Схемы ---

class GoalCreate(BaseModel):
    title: str
    vacancy_text: str | None = None
    resume_id: int | None = None


class RoadmapItemOut(BaseModel):
    id: int
    title: str
    description: str | None
    category: str | None
    status: RoadmapStatus
    order: int
    model_config = {"from_attributes": True}


class GoalOut(BaseModel):
    id: int
    title: str
    vacancy_text: str | None
    resume_id: int | None
    created_at: datetime
    # Прогресс
    total: int = 0
    done: int = 0
    percent: int = 0
    model_config = {"from_attributes": True}


class GoalDetailOut(GoalOut):
    items: list[RoadmapItemOut] = []


# --- Эндпоинты ---

@router.post("/", response_model=GoalOut, status_code=201)
def create_goal(
    payload: GoalCreate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Проверяем резюме если передано
    if payload.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == payload.resume_id,
            Resume.user_id == current_user.id,
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Резюме не найдено")

    goal = Goal(
        user_id=current_user.id,
        title=payload.title,
        vacancy_text=payload.vacancy_text,
        resume_id=payload.resume_id,
    )
    db.add(goal)
    db.flush()
    db.refresh(goal)
    return _goal_with_progress(goal)


@router.get("/", response_model=list[GoalOut])
def get_goals(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    return [_goal_with_progress(g) for g in goals]


@router.get("/{goal_id}", response_model=GoalDetailOut)
def get_goal(
    goal_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    result = _goal_with_progress(goal)
    result["items"] = sorted(goal.roadmap_items, key=lambda x: x.order)
    return result


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id,
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Цель не найдена")

    # Удаляем все пункты roadmap этой цели
    db.query(RoadmapItem).filter(RoadmapItem.goal_id == goal_id).delete()
    db.delete(goal)


# --- Хелпер ---

def _goal_with_progress(goal: Goal) -> dict:
    items = goal.roadmap_items or []
    total = len(items)
    done = sum(1 for i in items if i.status == RoadmapStatus.DONE)
    percent = int((done / total) * 100) if total > 0 else 0
    return {
        "id": goal.id,
        "title": goal.title,
        "vacancy_text": goal.vacancy_text,
        "resume_id": goal.resume_id,
        "created_at": goal.created_at,
        "total": total,
        "done": done,
        "percent": percent,
    }