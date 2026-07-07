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

# Built React app. When present, the API also serves the single-page frontend,
# so the whole product ships as one container / one process.
FRONTEND_DIST = Path(os.environ.get("FRONTEND_DIST", _REPO_ROOT / "frontend" / "dist"))

# Origins allowed to talk to the API during local development (Vite dev server).
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# --- "Market" constants (mock, but plausible) -------------------------------
# Long-run annualised return of the Liv-ex Fine Wine 100, used as the benchmark
# the cellar's alpha is measured against.
BENCHMARK_RETURN = 0.062
# Swiss-franc "risk free" rate — this is a Swiss private bank, after all.
RISK_FREE_RATE = 0.015
