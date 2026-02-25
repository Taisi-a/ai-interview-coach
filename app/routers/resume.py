# routers/resume.py
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Resume
from app.security import get_current_user

router = APIRouter(prefix="/resume")


# --- Схемы ---
class ResumeOut(BaseModel):
    id: int
    filename: str
    raw_text: str

    model_config = {"from_attributes": True}


# --- Вспомогательные функции: извлечение текста ---

def extract_from_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_from_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs)


# --- Эндпоинты ---

@router.post("/upload", response_model=ResumeOut, status_code=201)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if file.content_type == "application/pdf":
        content = file.file.read()
        raw_text = extract_from_pdf(content)
    elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        content = file.file.read()
        raw_text = extract_from_docx(content)
    else:
        raise HTTPException(status_code=415, detail="Только PDF и DOCX файлы")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Не удалось извлечь текст из файла")

    resume = Resume(
        filename=file.filename,
        raw_text=raw_text,
        user_id=current_user.id,
    )
    db.add(resume)
    db.flush()
    db.refresh(resume)
    return resume


@router.get("/", response_model=list[ResumeOut])
def get_resumes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return db.query(Resume).filter(Resume.user_id == current_user.id).all()


@router.get("/{resume_id}", response_model=ResumeOut)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == current_user.id
    ).first()

    if not resume:
        raise HTTPException(status_code=404, detail="Резюме не найдено")
    return resume