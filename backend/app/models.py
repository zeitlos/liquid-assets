"""Pydantic domain models.

These are the contract between the file store, the Œnometric Engine and the
React frontend. If it isn't a Pydantic model, it doesn't leave the building.
"""

from __future__ import annotations

import uuid
from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# --------------------------------------------------------------------------- #
# Enumerations
# --------------------------------------------------------------------------- #
class Region(str, Enum):
    BORDEAUX = "Bordeaux"
    BURGUNDY = "Burgundy"
    CHAMPAGNE = "Champagne"
    RHONE = "Rhône"
    TUSCANY = "Tuscany"
    PIEDMONT = "Piedmont"
    NAPA = "Napa Valley"
    RIOJA = "Rioja"
    MOSEL = "Mosel"
    PORT = "Port"


class BottleSize(str, Enum):
    """Format affects both prestige value and how gracefully a wine ages —
    larger formats age more slowly (a genuine oenological phenomenon)."""

    HALF = "Half (375ml)"
    STANDARD = "Standard (750ml)"
    MAGNUM = "Magnum (1.5L)"
    JEROBOAM = "Jeroboam (3L)"


class Verdict(str, Enum):
    LAY_DOWN = "LAY DOWN"        # too young — keep it in the dark
    HOLD = "HOLD"               # appreciating and improving
    SELL = "SELL"               # at peak and still climbing in value — monetise
    DRINK_NOW = "DRINK NOW"     # peak drinking, little financial upside left
    PAST_PEAK = "PAST PEAK"     # the window is closing — open it tonight


# --------------------------------------------------------------------------- #
# Core stored entity
# --------------------------------------------------------------------------- #
class BottleBase(BaseModel):
    name: str = Field(..., min_length=1, examples=["Château Margaux"])
    producer: str = Field(..., min_length=1, examples=["Château Margaux"])
    region: Region
    vintage: int = Field(..., ge=1900, le=2100)
    quantity: int = Field(..., ge=1, le=10_000)
    size: BottleSize = BottleSize.STANDARD
    purchase_price_chf: float = Field(..., gt=0, description="Per unit, in CHF")
    market_price_chf: float = Field(..., gt=0, description="Per unit, in CHF")
    purchase_date: date
    drink_from: int = Field(..., ge=1900, le=2200)
    drink_to: int = Field(..., ge=1900, le=2200)
    apogee_year: Optional[int] = Field(
        default=None,
        description="Year of peak maturity. Defaults to the middle of the drinking window.",
    )
    critic_score: int = Field(..., ge=50, le=100)
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _coherent_window(self) -> "BottleBase":
        if self.drink_to < self.drink_from:
            raise ValueError("drink_to must be on or after drink_from")
        if self.apogee_year is None:
            self.apogee_year = (self.drink_from + self.drink_to) // 2
        if not (self.drink_from <= self.apogee_year <= self.drink_to):
            raise ValueError("apogee_year must fall inside the drinking window")
        return self


class Bottle(BottleBase):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])


class BottleCreate(BottleBase):
    """Payload for adding a lot to the cellar (server assigns the id)."""


class BottleUpdate(BaseModel):
    """Every field optional — PATCH semantics."""

    name: Optional[str] = Field(default=None, min_length=1)
    producer: Optional[str] = Field(default=None, min_length=1)
    region: Optional[Region] = None
    vintage: Optional[int] = Field(default=None, ge=1900, le=2100)
    quantity: Optional[int] = Field(default=None, ge=1, le=10_000)
    size: Optional[BottleSize] = None
    purchase_price_chf: Optional[float] = Field(default=None, gt=0)
    market_price_chf: Optional[float] = Field(default=None, gt=0)
    purchase_date: Optional[date] = None
    drink_from: Optional[int] = Field(default=None, ge=1900, le=2200)
    drink_to: Optional[int] = Field(default=None, ge=1900, le=2200)
    apogee_year: Optional[int] = Field(default=None, ge=1900, le=2200)
    critic_score: Optional[int] = Field(default=None, ge=50, le=100)
    notes: Optional[str] = None


# --------------------------------------------------------------------------- #
# Derived / analytics response models
# --------------------------------------------------------------------------- #
class BottleAnalytics(BaseModel):
    bottle: Bottle
    current_value_chf: float
    cost_basis_chf: float
    unrealized_gain_chf: float
    unrealized_gain_pct: float
    drinkability: float = Field(..., description="0..1 — how good it tastes right now")
    years_to_apogee: int
    verdict: Verdict
    expected_annual_return: float
    projected_value_5y_chf: float
    cost_of_cork_chf: float = Field(
        ..., description="Expected appreciation forfeited by drinking the whole lot today"
    )


class CellarResponse(BaseModel):
    bottles: list[Bottle]
    count: int
    total_units: int


class AllocationSlice(BaseModel):
    region: Region
    value_chf: float
    weight: float
    lots: int
    units: int


class PortfolioMetrics(BaseModel):
    total_value_chf: float
    total_cost_basis_chf: float
    unrealized_gain_chf: float
    unrealized_gain_pct: float
    lots: int
    units: int
    unique_labels: int
    cellar_alpha: float = Field(..., description="Expected excess return over the benchmark")
    sharpe_ratio: float
    expected_annual_return: float
    volatility: float
    diversification_score: float = Field(..., description="1 − Herfindahl concentration index")
    value_at_risk_5pct_chf: float = Field(..., description="1-year 95% parametric VaR")
    projected_value_10y_chf: float
    peak_within_5y_value_chf: float = Field(
        ..., description="Value of lots reaching peak maturity in the next 5 years"
    )
    allocation: list[AllocationSlice]
    benchmark_return: float
    risk_free_rate: float


class MonteCarloResult(BaseModel):
    horizon_years: int
    n_paths: int
    seed: int
    years: list[int]
    p5: list[float]
    p25: list[float]
    p50: list[float]
    p75: list[float]
    p95: list[float]
    current_value_chf: float
    expected_terminal_value_chf: float
    best_case_chf: float
    worst_case_chf: float
    prob_profit: float


class FrontierPoint(BaseModel):
    label: str
    risk: float
    ret: float


class EfficientFrontier(BaseModel):
    assets: list[FrontierPoint]      # each region on its own
    cloud: list[FrontierPoint]       # randomly sampled portfolios
    frontier: list[FrontierPoint]    # the efficient frontier envelope
    cellar: FrontierPoint            # where the client's actual cellar sits


class CorrelationMatrix(BaseModel):
    labels: list[str]
    matrix: list[list[float]]


class MarketIndex(BaseModel):
    name: str
    symbol: str
    level: float
    change_pct: float
    spark: list[float]


class MarketPulse(BaseModel):
    as_of: str
    sentiment: str
    indices: list[MarketIndex]
