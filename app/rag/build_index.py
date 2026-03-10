from __future__ import annotations

from app.rag.handbook_loader import load_handbook_chunks
from app.rag.settings import RAG_HANDBOOK_DIR
from app.rag.vectorstore import upsert_texts


def build_index() -> int:
    chunks = load_handbook_chunks(RAG_HANDBOOK_DIR)
    if not chunks:
        raise RuntimeError(
            "No handbook documents found to index. "
            "Check RAG_HANDBOOK_DIR and that tech-interview-handbook-main is available inside the container."
        )
    ids = [c.id for c in chunks]
    texts = [c.text for c in chunks]
    metas = [{"source": c.source, "title": c.title} for c in chunks]
    upsert_texts(ids=ids, texts=texts, metadatas=metas)
    return len(chunks)


if __name__ == "__main__":
    count = build_index()
    print(f"Indexed chunks: {count}")

