# app/config.py
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret")
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://localhost:8001/v1")
LLM_DEFAULT_MODEL = os.getenv("LLM_DEFAULT_MODEL", "models/Qwen3-8B-Q4_K_M.gguf")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Модель на агента (если не задана — используется LLM_DEFAULT_MODEL)
# Ключи: hr, tech_lead, mentor, code_review
LLM_MODEL_BY_AGENT = {
    "hr": os.getenv("LLM_MODEL_HR") or LLM_DEFAULT_MODEL,
    "tech_lead": os.getenv("LLM_MODEL_TECH_LEAD") or LLM_DEFAULT_MODEL,
    "mentor": os.getenv("LLM_MODEL_MENTOR") or LLM_DEFAULT_MODEL,
    "code_review": os.getenv("LLM_MODEL_CODE_REVIEW") or LLM_DEFAULT_MODEL,
}


def get_model_for_agent(agent_type_value: str) -> str:
    """Возвращает имя модели для данного типа агента."""
    return LLM_MODEL_BY_AGENT.get(agent_type_value, LLM_DEFAULT_MODEL)