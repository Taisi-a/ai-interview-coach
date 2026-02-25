# app/config.py
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-dev-secret")
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", None)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")