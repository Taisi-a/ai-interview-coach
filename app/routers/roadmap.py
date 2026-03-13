# routers/roadmap.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel

from app.database import get_db
from app.models import RoadmapItem, RoadmapStatus
from app.security import get_current_user

router = APIRouter(prefix="/roadmap")


# --- Схемы ---

class RoadmapItemCreate(BaseModel):
    title: str
    description: str | None = None
    order: int = 0


class RoadmapItemUpdate(BaseModel):
    status: RoadmapStatus


class RoadmapItemOut(BaseModel):
    id: int
    title: str
    description: str | None
    status: RoadmapStatus
    order: int

    model_config = {"from_attributes": True}


class RoadmapProgressOut(BaseModel):
    total: int       # всего пунктов
    done: int        # выполнено
    percent: int     # процент прогресса
    items: list[RoadmapItemOut]


# --- Эндпоинты ---

@router.get("/", response_model=RoadmapProgressOut)
def get_roadmap(
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Получить roadmap с прогрессом."""
    items = db.query(RoadmapItem).filter(
        RoadmapItem.user_id == current_user.id
    ).order_by(RoadmapItem.order).all()

    total = len(items)
    done = sum(1 for i in items if i.status == RoadmapStatus.DONE)
    percent = int((done / total) * 100) if total > 0 else 0

    return RoadmapProgressOut(
        total=total,
        done=done,
        percent=percent,
        items=items,
    )


@router.post("/", response_model=RoadmapItemOut, status_code=201)
def create_roadmap_item(
    payload: RoadmapItemCreate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Создать пункт roadmap. Вызывается агентом после генерации плана."""
    item = RoadmapItem(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
        order=payload.order,
    )
    db.add(item)
    db.flush()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=RoadmapItemOut)
def update_roadmap_item(
    item_id: int,
    payload: RoadmapItemUpdate,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Обновить статус пункта. Юзер отмечает прогресс."""
    item = db.query(RoadmapItem).filter(
        RoadmapItem.id == item_id,
        RoadmapItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Пункт не найден")

    item.status = payload.status
    db.flush()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_roadmap_item(
    item_id: int,
    db: DBSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Удалить пункт roadmap."""
    item = db.query(RoadmapItem).filter(
        RoadmapItem.id == item_id,
        RoadmapItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Пункт не найден")

    db.delete(item)