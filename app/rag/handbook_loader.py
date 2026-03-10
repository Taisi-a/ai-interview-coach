from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class DocChunk:
    id: str
    text: str
    source: str
    title: str | None = None


def _iter_markdown_files(root: Path) -> list[Path]:
    # Берём только контент handbook (markdown). Исключаем исходники сайта.
    patterns = [
        "contents/**/*.md",
        "contents/**/*.mdx",
        "blog/**/*.md",
        "blog/**/*.mdx",
        "experimental/**/*.md",
        "experimental/**/*.mdx",
        "README.md",
    ]
    files: list[Path] = []
    for pat in patterns:
        files.extend(root.glob(pat))
    # Дедуп + стабильный порядок
    return sorted({p.resolve() for p in files if p.is_file()})


def _guess_title(text: str, fallback: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("#"):
            return line.lstrip("#").strip() or fallback
    return fallback


def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    # Очень простой чанкер по длине, чтобы не тянуть зависимости.
    if len(text) <= chunk_size:
        return [text]
    chunks: list[str] = []
    i = 0
    while i < len(text):
        end = min(len(text), i + chunk_size)
        chunk = text[i:end]
        chunks.append(chunk)
        if end == len(text):
            break
        i = max(0, end - overlap)
    return chunks


def load_handbook_chunks(handbook_root: str) -> list[DocChunk]:
    root = Path(handbook_root).expanduser().resolve()
    files = _iter_markdown_files(root)

    out: list[DocChunk] = []
    for path in files:
        raw = path.read_text(encoding="utf-8", errors="ignore")
        title = _guess_title(raw, fallback=path.stem)
        rel = str(path.relative_to(root))
        pieces = _chunk_text(raw)
        for idx, piece in enumerate(pieces):
            chunk_id = f"{rel}::chunk::{idx}"
            out.append(
                DocChunk(
                    id=chunk_id,
                    text=piece,
                    source=rel,
                    title=title,
                )
            )
    return out

