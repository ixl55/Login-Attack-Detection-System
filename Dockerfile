# --- Build the React dashboard ---
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Python API serving the API + built dashboard ---
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    LADS_DATABASE_URL=sqlite:////data/lads.db
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/
COPY data/ data/
COPY scripts/ scripts/
COPY --from=frontend /frontend/dist frontend/dist
VOLUME /data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
