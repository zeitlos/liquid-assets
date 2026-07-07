"""A synthetic-but-persistent fine-wine market feed.

Every request nudges each index by a small random walk and persists the new
state to disk, so the numbers genuinely drift between page loads (and survive
restarts) instead of being re-randomised each time. This is the second thing
we read/write to the data volume.
"""

from __future__ import annotations

import json
import random
import threading
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .models import MarketIndex, MarketPulse

_LOCK = threading.RLock()

# (symbol, name, starting level, annualised drift, per-tick volatility)
_INDEX_DEFS = [
    ("LX100", "Liv-ex Fine Wine 100", 382.4),
    ("LX1000", "Liv-ex Fine Wine 1000", 356.1),
    ("BURG150", "Burgundy 150", 512.7),
    ("CHMP50", "Champagne 50", 468.9),
    ("BDX500", "Bordeaux 500", 318.2),
    ("NAPA", "California Cult Index", 291.5),
]

_SPARK_LEN = 32


def _market_path() -> Path:
    return config.DATA_DIR / "market.json"


def _seed_state() -> dict:
    return {
        "tick": 0,
        "indices": {
            sym: {"level": level, "spark": [level]}
            for sym, name, level in _INDEX_DEFS
        },
    }


def _load_state() -> dict:
    path = _market_path()
    if not path.exists():
        return _seed_state()
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return _seed_state()


def _save_state(state: dict) -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    _market_path().write_text(json.dumps(state), encoding="utf-8")


def pulse() -> MarketPulse:
    """Advance the walk one tick, persist it, and return the current snapshot."""
    with _LOCK:
        state = _load_state()
        tick = int(state.get("tick", 0)) + 1
        # Deterministic given the tick — reproducible, but always moving forward.
        rng = random.Random(tick * 2654435761 % (2**32))

        indices: list[MarketIndex] = []
        for sym, name, base in _INDEX_DEFS:
            entry = state["indices"].get(sym, {"level": base, "spark": [base]})
            prev = float(entry["level"])
            # Small mean-reverting-ish drift with a bullish tilt.
            step = rng.gauss(0.0006, 0.006)
            level = max(1.0, prev * (1.0 + step))
            spark = (entry.get("spark", []) + [round(level, 2)])[-_SPARK_LEN:]
            change_pct = (level / prev - 1.0) if prev else 0.0
            state["indices"][sym] = {"level": level, "spark": spark}
            indices.append(
                MarketIndex(
                    name=name,
                    symbol=sym,
                    level=round(level, 2),
                    change_pct=round(change_pct, 5),
                    spark=spark,
                )
            )

        state["tick"] = tick
        _save_state(state)

        avg = sum(i.change_pct for i in indices) / len(indices)
        sentiment = "Bullish" if avg > 0.001 else "Bearish" if avg < -0.001 else "Neutral"
        as_of = datetime.now(timezone.utc).isoformat(timespec="seconds")
        return MarketPulse(as_of=as_of, sentiment=sentiment, indices=indices)
