# NyaberaWorks API (FastAPI). Built by deploy/docker-compose.yml.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so rebuilds are fast when only code changes.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

# Run as a normal user, not root.
RUN useradd --system --no-create-home --uid 10001 app
USER app

# Hosts such as Cloud Run choose the port and pass it in PORT; default 8000 elsewhere.
ENV PORT=8000
EXPOSE 8000

# "Ready" also checks the database connection.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD python -c "import os, sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:%s/api/health/ready' % os.environ['PORT'], timeout=4).status == 200 else 1)"

# Behind Caddy, set FORWARDED_ALLOW_IPS=* (see deploy/docker-compose.yml) so uvicorn
# reads the real visitor address. Left unset (Cloud Run), forwarded headers are not trusted.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --proxy-headers --workers ${WEB_CONCURRENCY:-2}"]
