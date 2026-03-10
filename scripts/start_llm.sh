#!/usr/bin/env bash
# Запуск Qwen3 через llama.cpp (OpenAI-совместимый сервер на порту 8001).
# Вызывать из корня проекта: ./scripts/start_llm.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MODEL_DIR="${LLM_MODEL_DIR:-./models}"
MODEL_FILE="${LLM_MODEL_FILE:-Qwen3-8B-Q4_K_M.gguf}"
MODEL_PATH="$MODEL_DIR/$MODEL_FILE"
PORT="${LLM_PORT:-8001}"
HF_REPO="${LLM_HF_REPO:-Qwen/Qwen3-8B-GGUF}"

mkdir -p "$MODEL_DIR"

if [[ ! -f "$MODEL_PATH" ]]; then
  echo "Модель не найдена: $MODEL_PATH"
  echo "Скачиваю $HF_REPO ($MODEL_FILE) в $MODEL_DIR ..."
  huggingface-cli download "$HF_REPO" "$MODEL_FILE" --local-dir "$MODEL_DIR"
fi

echo "Запуск llama.cpp server: $MODEL_PATH, порт $PORT"
exec python -m llama_cpp.server --model "$MODEL_PATH" --port "$PORT"
