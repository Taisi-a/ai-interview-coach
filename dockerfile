FROM python:3.11-slim

WORKDIR /app

COPY requirements_freeze.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements_freeze.txt && \
    pip install alembic

COPY ./app ./app
COPY ./alembic ./alembic
COPY alembic.ini .

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${APP_PORT} --reload"]