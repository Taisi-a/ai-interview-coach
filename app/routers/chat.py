# routers/chat.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.security import get_current_user
from app.config import VLLM_BASE_URL, LLM_DEFAULT_MODEL
from app.llm_utils import strip_think_tags
from app.rag.settings import RAG_ENABLED, RAG_TOP_K, RAG_MAX_CONTEXT_CHARS
from app.rag.vectorstore import query_text

router = APIRouter(prefix="/chat")


# --- Схемы в OpenAI формате ---

class Message(BaseModel):
    role: str      # "system", "user", "assistant"
    content: str


class ChatRequest(BaseModel):
    model: str = LLM_DEFAULT_MODEL
    messages: list[Message]
    max_tokens: int = 10000
    temperature: float = 0.7


class ChatChoice(BaseModel):
    index: int
    message: Message
    finish_reason: str


class ChatResponse(BaseModel):
    model: str
    choices: list[ChatChoice]


# --- Эндпоинт ---

@router.post("/completions", response_model=ChatResponse)
def chat_completions(
    request: ChatRequest,
    current_user=Depends(get_current_user),
):
    reply = _call_llm(request)

    return ChatResponse(
        model=request.model,
        choices=[
            ChatChoice(
                index=0,
                message=Message(role="assistant", content=reply),
                finish_reason="stop",
            )
        ],
    )


def _call_llm(request: ChatRequest) -> str:
    """Вызов LLM по OpenAI-совместимому API (vLLM / llama.cpp и т.д.)."""
    from openai import OpenAI

    messages = [m.model_dump() for m in request.messages]
    if RAG_ENABLED:
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if last_user.strip():
            try:
                hits = query_text(last_user, top_k=RAG_TOP_K)
            except Exception:
                hits = []
            if hits:
                context_lines: list[str] = []
                total = 0
                for i, h in enumerate(hits, start=1):
                    meta = h.get("meta") or {}
                    src = meta.get("source") or "unknown"
                    title = meta.get("title")
                    header = f"[{i}] {title + ' — ' if title else ''}{src}"
                    snippet = (h.get("text") or "").strip()
                    block = f"{header}\n{snippet}"
                    if total + len(block) > RAG_MAX_CONTEXT_CHARS:
                        break
                    context_lines.append(block)
                    total += len(block) + 2

                rag_system = "TECH INTERVIEW HANDBOOK (RAG):\n" + "\n\n".join(context_lines)
                messages = [{"role": "system", "content": rag_system}] + messages

    client = OpenAI(
        api_key="not-needed",
        base_url=VLLM_BASE_URL,
    )
    response = client.chat.completions.create(
        model=request.model,
        messages=messages,
        max_tokens=request.max_tokens,
        temperature=request.temperature,
    )
    raw = response.choices[0].message.content or ""
    return strip_think_tags(raw)