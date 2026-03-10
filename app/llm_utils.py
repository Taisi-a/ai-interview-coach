# app/llm_utils.py
import re

_THINK_OPEN = "<" + "think" + ">"
_THINK_CLOSE = "<" + "/" + "think" + ">"


def strip_think_tags(text: str) -> str:
    """Удаляет блоки think из ответа модели (для Qwen и др.)."""
    if not text or not text.strip():
        return text
    pattern = re.escape(_THINK_OPEN) + r".*?" + re.escape(_THINK_CLOSE)
    return re.sub(pattern, "", text, flags=re.DOTALL).strip()