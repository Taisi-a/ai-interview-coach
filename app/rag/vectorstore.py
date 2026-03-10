from __future__ import annotations

from typing import Any

import chromadb
from chromadb.config import Settings
from fastembed import TextEmbedding

from app.rag.settings import (
    RAG_COLLECTION,
    RAG_EMBED_MODEL,
    RAG_PERSIST_DIR,
)


_embedder: TextEmbedding | None = None


def _get_embedder() -> TextEmbedding:
    global _embedder
    if _embedder is None:
        _embedder = TextEmbedding(model_name=RAG_EMBED_MODEL)
    return _embedder


def _embed(texts: list[str]) -> list[list[float]]:
    embedder = _get_embedder()
    vectors = list(embedder.embed(texts))
    return [v.tolist() for v in vectors]


def get_collection():
    client = chromadb.PersistentClient(
        path=RAG_PERSIST_DIR,
        settings=Settings(anonymized_telemetry=False),
    )
    return client.get_or_create_collection(name=RAG_COLLECTION, metadata={"hnsw:space": "cosine"})


def upsert_texts(ids: list[str], texts: list[str], metadatas: list[dict[str, Any]]):
    col = get_collection()
    embeddings = _embed(texts)
    col.upsert(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)


def query_text(query: str, top_k: int) -> list[dict[str, Any]]:
    col = get_collection()
    emb = _embed([query])[0]
    res = col.query(
        query_embeddings=[emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    docs = res.get("documents", [[]])[0]
    metas = res.get("metadatas", [[]])[0]
    dists = res.get("distances", [[]])[0]

    out: list[dict[str, Any]] = []
    for doc, meta, dist in zip(docs, metas, dists):
        out.append({"text": doc, "meta": meta or {}, "distance": dist})
    return out

