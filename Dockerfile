FROM python:3.11-slim

WORKDIR /app

COPY requirements_freeze.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements_freeze.txt

COPY ./app ./app

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT} --reload"]
