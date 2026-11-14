# ==============================================================================
# NETLAB AI - Production Backend Dockerfile (FastAPI + Async Python)
# ==============================================================================
FROM python:3.11-slim-bookworm AS base

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DISABLE_SQLALCHEMY_CEXT=1 \
    APP_ENV=production

WORKDIR /app

# Install system dependencies for network tools & scapy
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    iputils-ping \
    tcpdump \
    net-tools \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application source
COPY backend /app/backend

# Create non-root user for security
RUN useradd -m -u 1001 netlabuser && \
    chown -R netlabuser:netlabuser /app

USER netlabuser
WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
