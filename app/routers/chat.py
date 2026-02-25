# routers/chat.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.security import get_current_user

router = APIRouter(prefix="/chat")


# --- Схемы в OpenAI формате ---

class Message(BaseModel):
    role: str      # "system", "user", "assistant"
    content: str


class ChatRequest(BaseModel):
    model: str = "UI-TARS-1.5-7B"
    messages: list[Message]
    max_tokens: int = 512
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
    """
    Сейчас — заглушка.
    Когда команда поднимет vllm — раскомментировать блок ниже
    и убрать return с заглушкой.
    """

    # from openai import OpenAI
    # client = OpenAI(
    #     api_key="not-needed",
    #     base_url="http://АДРЕС_СЕРВЕРА/v1"  # <- вставить адрес vllm
    # )
    # response = client.chat.completions.create(
    #     model=request.model,
    #     messages=[m.model_dump() for m in request.messages],
    #     max_tokens=request.max_tokens,
    #     temperature=request.temperature,
    # )
    # return response.choices[0].message.content

    last_user_message = next(
        (m.content for m in reversed(request.messages) if m.role == "user"),
        "пустой запрос"
    )
    return f"[Заглушка] Получил: '{last_user_message}'. Подключим vllm как будет готов!"