"""FastAPI application.

Exposes the Œnometric Engine over HTTP and — when a built frontend is present —
serves the React single-page app from the same process, so the entire product
is one deployable unit.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

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
    allow_origins=config.DEV_ORIGINS,
    allow_credentials=True,
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
    updated = repository.update_bottle(bottle_id, patch)
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
# Serve the built React app (production single-process mode)
# --------------------------------------------------------------------------- #
if config.FRONTEND_DIST.exists():
    # Anything not matched above falls through to the SPA's index.html.
    app.mount("/", StaticFiles(directory=str(config.FRONTEND_DIST), html=True), name="spa")
else:
    @app.get("/", tags=["meta"])
    def root() -> dict:
        return {
            "message": "Liquid Assets™ API is live. Build the frontend to serve the UI here.",
            "docs": "/docs",
        }
