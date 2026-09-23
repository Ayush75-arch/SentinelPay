# SentinelPay

Behavioral anomaly detection and explainable risk decisions for micro-transactions.

## Local development

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn sentinelpay.backend.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

For local frontend-to-backend calls, set `VITE_API_BASE_URL=http://127.0.0.1:8000` in the frontend environment or use the built-in localhost fallback.

## Vercel deployment

Create one Vercel project from this repository:

- Root Directory: leave empty
- Framework: Vite
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`
- `api/index.py` serves FastAPI and `vercel.json` routes API paths to it

The frontend uses same-origin API calls in production. You do not need to set
`VITE_API_BASE_URL` for the single-project deployment; optionally set it to `/`.

Set these Vercel environment variables:

```text
SENTINELPAY_DATABASE_URL=<Render PostgreSQL URL>
SENTINELPAY_CORS_ORIGINS=https://<frontend-vercel-domain>
SENTINELPAY_WEBAUTHN_ORIGIN=https://<frontend-vercel-domain>
```

Do not commit database credentials. The backend uses SQLite only as a local fallback and PostgreSQL in deployment.

## Demo scenarios

With the backend running, use `python demo.py normal --base-url http://127.0.0.1:8000` or the dashboard's demo controls. Available scenarios include normal, location-anomaly, amount-anomaly, time-anomaly, merchant-anomaly, shadow-subscription, and multi-signal.
