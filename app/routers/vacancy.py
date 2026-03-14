# routers/vacancy.py
import httpx
import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.security import get_current_user
from app.database import get_db
from app.models import SavedVacancy

router = APIRouter(prefix="/vacancy")
HH_API_URL = "https://api.hh.ru/vacancies"


class SavedVacancyOut(BaseModel):
    id: int
    vacancy_id: str
    title: str | None
    company: str | None

    model_config = {"from_attributes": True}


@router.get("/saved", response_model=list[SavedVacancyOut])
def get_saved_vacancies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(SavedVacancy).filter(
        SavedVacancy.user_id == current_user.id
    ).all()


@router.post("/save/{vacancy_id}", response_model=SavedVacancyOut, status_code=201)
async def save_vacancy(
    vacancy_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{HH_API_URL}/{vacancy_id}",
            headers={"User-Agent": "AI-Interview-Coach/1.0"},
        )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Ошибка при получении вакансии с hh.ru")

    data = response.json()

    vacancy = SavedVacancy(
        user_id=current_user.id,
        vacancy_id=vacancy_id,
        title=data.get("name"),
        company=data.get("employer", {}).get("name"),
        raw_json=json.dumps(data, ensure_ascii=False),
    )
    db.add(vacancy)
    db.flush()
    db.refresh(vacancy)
    return vacancy


@router.get("/{vacancy_id}")
async def get_vacancy(
    vacancy_id: str,
    current_user=Depends(get_current_user),
):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{HH_API_URL}/{vacancy_id}",
            headers={"User-Agent": "AI-Interview-Coach/1.0"},
        )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Вакансия не найдена")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Ошибка при получении вакансии с hh.ru")

    return response.json()