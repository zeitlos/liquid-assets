# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Single portable image: build the React frontend, then serve it (plus the API)
# from one FastAPI/uvicorn process. Runs anywhere Docker/OCI images run.
# ---------------------------------------------------------------------------

# 1) Build the frontend -----------------------------------------------------
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Python runtime ---------------------------------------------------------
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DATA_DIR=/data \
    FRONTEND_DIST=/app/frontend/dist

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN mkdir -p /data
EXPOSE 8000
WORKDIR /app/backend

# Honour $PORT if the platform injects one, else default to 8000.
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
