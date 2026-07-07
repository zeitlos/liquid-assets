"""File-backed persistence.

The whole "database" is a couple of JSON files under DATA_DIR. In production
DATA_DIR points at a mounted volume; locally it's ./backend/data. Every write
is atomic (write-temp-then-rename) so a crash can never leave a half-written
cellar on disk.
"""

from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path

from . import config
from .models import Bottle, BottleCreate, BottleUpdate
from .seed import seed_bottles

_LOCK = threading.RLock()


def _cellar_path() -> Path:
    return config.DATA_DIR / "cellar.json"


def _ensure_data_dir() -> None:
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)


def _atomic_write(path: Path, payload: str) -> None:
    _ensure_data_dir()
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(payload)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def _write(bottles: list[Bottle]) -> None:
    payload = json.dumps(
        {"bottles": [b.model_dump(mode="json") for b in bottles]},
        indent=2,
        ensure_ascii=False,
    )
    _atomic_write(_cellar_path(), payload)


def _read() -> list[Bottle]:
    path = _cellar_path()
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [Bottle.model_validate(item) for item in raw.get("bottles", [])]


def _ensure_seeded() -> None:
    if not _cellar_path().exists():
        _write(seed_bottles())


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def list_bottles() -> list[Bottle]:
    with _LOCK:
        _ensure_seeded()
        return _read()


def get_bottle(bottle_id: str) -> Bottle | None:
    with _LOCK:
        return next((b for b in list_bottles() if b.id == bottle_id), None)


def add_bottle(payload: BottleCreate) -> Bottle:
    with _LOCK:
        bottles = list_bottles()
        bottle = Bottle(**payload.model_dump())
        bottles.append(bottle)
        _write(bottles)
        return bottle


def update_bottle(bottle_id: str, patch: BottleUpdate) -> Bottle | None:
    with _LOCK:
        bottles = list_bottles()
        for i, b in enumerate(bottles):
            if b.id == bottle_id:
                data = b.model_dump()
                data.update(patch.model_dump(exclude_unset=True))
                # Re-validate through the model (keeps the drinking window coherent).
                updated = Bottle.model_validate(data)
                bottles[i] = updated
                _write(bottles)
                return updated
        return None


def delete_bottle(bottle_id: str) -> bool:
    with _LOCK:
        bottles = list_bottles()
        remaining = [b for b in bottles if b.id != bottle_id]
        if len(remaining) == len(bottles):
            return False
        _write(remaining)
        return True


def reset_cellar() -> list[Bottle]:
    """Restore the demo cellar — handy for a live presentation reset."""
    with _LOCK:
        fresh = seed_bottles()
        _write(fresh)
        return fresh
