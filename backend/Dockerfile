# ==============================================================================
# Dockerfile para Backend (Django 5 + DRF + PostgreSQL 16)
# ERP Almacén e Inventarios - Tribu 2 (Equipo 2)
# ==============================================================================

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Instalar dependencias del sistema y utilidades de red
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    netcat-openbsd \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Permisos para el script de entrada
RUN chmod +x /app/docker-entrypoint.sh

# Crear usuario sin privilegios root por seguridad
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]
