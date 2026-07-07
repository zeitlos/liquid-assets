# Liquid Assets™ — Backend (Œnometric Engine)

FastAPI + Pydantic. No third-party numerics — the Monte Carlo, Cholesky
factorisation and Markowitz frontier are all hand-rolled so it runs anywhere.

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Data

State is stored as JSON under `DATA_DIR` (default `./backend/data`):

- `cellar.json` — the wine portfolio (seeded on first run)
- `market.json` — the drifting market-index feed

Point `DATA_DIR` at a mounted volume in production. This service is **API-only** —
the React UI is served by the separate Node.js frontend service, which reverse-
proxies `/api` here. `CORS_ORIGINS` (default `*`) only matters if a browser calls
this API directly (e.g. the Vite dev server).

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/health` | Liveness probe |
| GET | `/api/cellar` | List the cellar |
| POST | `/api/cellar/bottles` | Add a lot |
| GET | `/api/cellar/bottles/{id}` | One lot, fully analysed |
| PATCH | `/api/cellar/bottles/{id}` | Update a lot |
| DELETE | `/api/cellar/bottles/{id}` | Drink/sell a lot |
| POST | `/api/cellar/reset` | Restore the demo cellar |
| GET | `/api/analytics/portfolio` | Cellar-wide metrics (alpha, Sharpe, VaR…) |
| GET | `/api/analytics/bottles` | Per-lot verdicts & Cost-of-the-Cork™ |
| GET | `/api/analytics/frontier` | Markowitz efficient frontier |
| GET | `/api/analytics/correlation` | Regional correlation matrix |
| POST | `/api/engine/simulate` | Correlated-GBM Monte Carlo |
| GET | `/api/market/pulse` | Live-drifting index feed |
