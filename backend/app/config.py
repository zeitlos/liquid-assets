"""Runtime configuration.

Everything here is overridable via environment variables so the same image
runs identically on a laptop and on a platform with a mounted volume.
"""

from __future__ import annotations

import os
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]

# Where the cellar and market state live. Point DATA_DIR at a mounted volume
# in production; defaults to ./backend/data for local development.
DATA_DIR = Path(os.environ.get("DATA_DIR", _REPO_ROOT / "backend" / "data"))

# This backend is API-only. In production the Node frontend server reverse-
# proxies /api to it (server-to-server, so CORS is not exercised). CORS still
# matters if a browser calls the API directly — e.g. the Vite dev server, or a
# frontend build pointed straight at the backend. Comma-separated; "*" = any.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

# --- "Market" constants (mock, but plausible) -------------------------------
# Long-run annualised return of the Liv-ex Fine Wine 100, used as the benchmark
# the cellar's alpha is measured against.
BENCHMARK_RETURN = 0.062
# Swiss-franc "risk free" rate — this is a Swiss private bank, after all.
RISK_FREE_RATE = 0.015
