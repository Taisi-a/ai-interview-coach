# routers/vacancy.py
import httpx
from fastapi import APIRouter, HTTPException, Depends
from app.security import get_current_user

router = APIRouter(prefix="/vacancy")

HH_API_URL = "https://api.hh.ru/vacancies"


@router.get("/{vacancy_id}")
async def get_vacancy(
    vacancy_id: str,
    current_user=Depends(get_current_user),
):
    """
    Получает данные вакансии с hh.ru по ID.
    Фронт передаёт ID из ссылки вида: https://hh.ru/vacancy/671337
    """
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