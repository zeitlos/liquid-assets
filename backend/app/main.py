"""FastAPI application — the API-only backend service.

Exposes the Œnometric Engine over HTTP. The React single-page app is served by
a separate Node.js frontend service, which reverse-proxies /api here.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from . import __version__, config, engine, market, repository
from .models import (
    Bottle,
    BottleAnalytics,
    BottleCreate,
    BottleUpdate,
    CellarResponse,
    CorrelationMatrix,
    EfficientFrontier,
    MarketPulse,
    MonteCarloResult,
    PortfolioMetrics,
)

app = FastAPI(
    title="Liquid Assets™ — Œnometric Engine",
    version=__version__,
    description=(
        "Institutional-grade portfolio intelligence for the world's most "
        "illiquid liquid asset. A Passion-Asset Desk citizen-development project."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #
class SimulationRequest(BaseModel):
    horizon_years: int = Field(default=10, ge=1, le=30)
    n_paths: int = Field(default=5000, ge=100, le=20_000)
    seed: int = Field(default=42, ge=0)


# --------------------------------------------------------------------------- #
# Health & meta
# --------------------------------------------------------------------------- #
@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "engine": "Œnometric", "version": __version__}


# --------------------------------------------------------------------------- #
# Cellar CRUD (reads/writes the JSON file store)
# --------------------------------------------------------------------------- #
@app.get("/api/cellar", response_model=CellarResponse, tags=["cellar"])
def get_cellar() -> CellarResponse:
    bottles = repository.list_bottles()
    return CellarResponse(
        bottles=bottles,
        count=len(bottles),
        total_units=sum(b.quantity for b in bottles),
    )


@app.post("/api/cellar/bottles", response_model=Bottle, status_code=201, tags=["cellar"])
def create_bottle(payload: BottleCreate) -> Bottle:
    return repository.add_bottle(payload)


@app.get("/api/cellar/bottles/{bottle_id}", response_model=BottleAnalytics, tags=["cellar"])
def get_bottle(bottle_id: str) -> BottleAnalytics:
    bottle = repository.get_bottle(bottle_id)
    if bottle is None:
        raise HTTPException(status_code=404, detail="Bottle not found")
    return engine.analyse_bottle(bottle)


@app.patch("/api/cellar/bottles/{bottle_id}", response_model=Bottle, tags=["cellar"])
def patch_bottle(bottle_id: str, patch: BottleUpdate) -> Bottle:
    try:
        updated = repository.update_bottle(bottle_id, patch)
    except ValidationError as exc:
        # The merged bottle is incoherent (e.g. drink_to < drink_from) — this is
        # a bad request, not a server error.
        raise HTTPException(
            status_code=422,
            detail=[{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()],
        )
    if updated is None:
        raise HTTPException(status_code=404, detail="Bottle not found")
    return updated


@app.delete("/api/cellar/bottles/{bottle_id}", status_code=204, tags=["cellar"])
def remove_bottle(bottle_id: str) -> None:
    if not repository.delete_bottle(bottle_id):
        raise HTTPException(status_code=404, detail="Bottle not found")


@app.post("/api/cellar/reset", response_model=CellarResponse, tags=["cellar"])
def reset_cellar() -> CellarResponse:
    bottles = repository.reset_cellar()
    return CellarResponse(
        bottles=bottles,
        count=len(bottles),
        total_units=sum(b.quantity for b in bottles),
    )


# --------------------------------------------------------------------------- #
# Analytics
# --------------------------------------------------------------------------- #
@app.get("/api/analytics/portfolio", response_model=PortfolioMetrics, tags=["analytics"])
def portfolio() -> PortfolioMetrics:
    return engine.portfolio_metrics(repository.list_bottles())


@app.get("/api/analytics/bottles", response_model=list[BottleAnalytics], tags=["analytics"])
def bottle_analytics() -> list[BottleAnalytics]:
    return [engine.analyse_bottle(b) for b in repository.list_bottles()]


@app.get("/api/analytics/frontier", response_model=EfficientFrontier, tags=["analytics"])
def frontier() -> EfficientFrontier:
    return engine.efficient_frontier(repository.list_bottles())


@app.get("/api/analytics/correlation", response_model=CorrelationMatrix, tags=["analytics"])
def correlation() -> CorrelationMatrix:
    return engine.correlation_matrix()


@app.post("/api/engine/simulate", response_model=MonteCarloResult, tags=["engine"])
def simulate(req: SimulationRequest) -> MonteCarloResult:
    return engine.monte_carlo(
        repository.list_bottles(),
        horizon_years=req.horizon_years,
        n_paths=req.n_paths,
        seed=req.seed,
    )


# --------------------------------------------------------------------------- #
# Market feed
# --------------------------------------------------------------------------- #
@app.get("/api/market/pulse", response_model=MarketPulse, tags=["market"])
def market_pulse() -> MarketPulse:
    return market.pulse()


# --------------------------------------------------------------------------- #
# Root — this service is API-only; the UI is served by the Node frontend.
# --------------------------------------------------------------------------- #
@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "service": "Liquid Assets™ — Œnometric Engine (API)",
        "status": "ok",
        "docs": "/docs",
        "ui": "served separately by the Node.js frontend service",
    }
