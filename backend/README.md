# SentinelPay Backend

## Local development

```bash
cd backend
pip install -r requirements.txt
uvicorn sentinelpay.backend.main:app --reload --host 127.0.0.1 --port 8000
```

The health check is available at `http://127.0.0.1:8000/health`.

## Vercel

Use `backend` as the Vercel project root. The Vercel Python entrypoint is `api/index.py`.

Set these environment variables in the backend project:

```text
SENTINELPAY_DATABASE_URL=<Render PostgreSQL URL>
SENTINELPAY_CORS_ORIGINS=https://<frontend-vercel-domain>
```
