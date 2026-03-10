import os


RAG_ENABLED = os.getenv("RAG_ENABLED", "true").lower() in ("1", "true", "yes", "on")

# Где лежит Tech Interview Handbook (внутри репо)
RAG_HANDBOOK_DIR = os.getenv(
    "RAG_HANDBOOK_DIR",
    "/app/tech-interview-handbook-main/apps/website",
)

# Где хранить индекс Chroma (persist)
RAG_PERSIST_DIR = os.getenv("RAG_PERSIST_DIR", "/app/rag_store")
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "tech_interview_handbook")

# Модель эмбеддингов (FastEmbed)
RAG_EMBED_MODEL = os.getenv("RAG_EMBED_MODEL", "BAAI/bge-small-en-v1.5")

# Сколько фрагментов подмешивать в промпт
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "6"))

# Ограничение на размер контекста, который подмешиваем
RAG_MAX_CONTEXT_CHARS = int(os.getenv("RAG_MAX_CONTEXT_CHARS", "6000"))

