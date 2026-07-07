"""The Œnometric Engine™.

Genuine quantitative finance, applied — with a straight face — to wine:

  * per-region return/risk parameters and a single-factor correlation model
  * geometric Brownian motion Monte Carlo with *correlated* regional shocks
  * a Markowitz efficient frontier over the regions
  * an asymmetric-Gaussian "drinkability" maturity curve
  * a drink / hold / sell verdict and a Cost-of-the-Cork™ metric

No third-party numerics: the linear algebra (Cholesky, quadratic forms) is
hand-rolled so the whole thing runs anywhere Python does.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date

from .config import BENCHMARK_RETURN, RISK_FREE_RATE
from .models import (
    AllocationSlice,
    Bottle,
    BottleAnalytics,
    BottleSize,
    CorrelationMatrix,
    EfficientFrontier,
    FrontierPoint,
    MonteCarloResult,
    PortfolioMetrics,
    Region,
    Verdict,
)


# --------------------------------------------------------------------------- #
# Market model
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class RegionParams:
    mu: float      # expected annual appreciation (drift)
    sigma: float   # annual volatility
    loading: float  # exposure to the common "fine wine" factor (drives correlation)


# Calibrated to look plausible: Burgundy hot and volatile, Port slow and steady.
REGION_PARAMS: dict[Region, RegionParams] = {
    Region.BORDEAUX: RegionParams(0.058, 0.12, 0.82),
    Region.BURGUNDY: RegionParams(0.089, 0.19, 0.78),
    Region.CHAMPAGNE: RegionParams(0.071, 0.14, 0.70),
    Region.RHONE: RegionParams(0.049, 0.11, 0.66),
    Region.TUSCANY: RegionParams(0.055, 0.13, 0.68),
    Region.PIEDMONT: RegionParams(0.067, 0.15, 0.64),
    Region.NAPA: RegionParams(0.074, 0.17, 0.60),
    Region.RIOJA: RegionParams(0.041, 0.10, 0.55),
    Region.MOSEL: RegionParams(0.038, 0.12, 0.42),
    Region.PORT: RegionParams(0.033, 0.09, 0.35),
}

REGIONS: list[Region] = list(REGION_PARAMS.keys())

# Larger formats age more slowly — this widens the maturity plateau.
_SIZE_AGING: dict[BottleSize, float] = {
    BottleSize.HALF: 0.80,
    BottleSize.STANDARD: 1.00,
    BottleSize.MAGNUM: 1.20,
    BottleSize.JEROBOAM: 1.35,
}


def current_year() -> int:
    return date.today().year


# --------------------------------------------------------------------------- #
# Correlation via a single-factor model  →  corr(i, j) = bᵢ·bⱼ, corr(i, i) = 1
# This is positive-definite by construction, so Cholesky always succeeds.
# --------------------------------------------------------------------------- #
def _correlation(a: Region, b: Region) -> float:
    if a == b:
        return 1.0
    return REGION_PARAMS[a].loading * REGION_PARAMS[b].loading


def _corr_matrix(regions: list[Region]) -> list[list[float]]:
    return [[_correlation(a, b) for b in regions] for a in regions]


def _cholesky(matrix: list[list[float]]) -> list[list[float]]:
    """Lower-triangular L such that L·Lᵀ = matrix (matrix must be SPD)."""
    n = len(matrix)
    lower = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(lower[i][k] * lower[j][k] for k in range(j))
            if i == j:
                lower[i][j] = math.sqrt(max(matrix[i][i] - s, 1e-12))
            else:
                lower[i][j] = (matrix[i][j] - s) / lower[j][j]
    return lower


def _quadratic_form(weights: list[float], cov: list[list[float]]) -> float:
    """wᵀ · Σ · w."""
    n = len(weights)
    total = 0.0
    for i in range(n):
        wi = weights[i]
        if wi == 0.0:
            continue
        row = cov[i]
        for j in range(n):
            total += wi * row[j] * weights[j]
    return total


def _covariance(regions: list[Region]) -> list[list[float]]:
    corr = _corr_matrix(regions)
    sig = [REGION_PARAMS[r].sigma for r in regions]
    return [
        [corr[i][j] * sig[i] * sig[j] for j in range(len(regions))]
        for i in range(len(regions))
    ]


# --------------------------------------------------------------------------- #
# Maturity ("drinkability") curve
# --------------------------------------------------------------------------- #
def drinkability(
    year: int,
    drink_from: int,
    drink_to: int,
    apogee: int,
    size: BottleSize = BottleSize.STANDARD,
) -> float:
    """Asymmetric Gaussian peaking at the apogee.

    Returns ~1.0 at the apogee and ~0.38 at the edges of the drinking window;
    larger formats stretch the curve (they age more slowly).
    """
    aging = _SIZE_AGING.get(size, 1.0)
    left = max(apogee - drink_from, 1) * aging
    right = max(drink_to - apogee, 1) * aging
    sigma = (left if year <= apogee else right) / 1.4
    value = math.exp(-((year - apogee) ** 2) / (2.0 * sigma * sigma))
    return round(max(0.0, min(1.0, value)), 4)


def effective_mu(bottle: Bottle) -> float:
    """Region drift nudged by critic score: a 100-point wine appreciates faster."""
    base = REGION_PARAMS[bottle.region].mu
    adjustment = (bottle.critic_score - 92) * 0.002
    return max(0.0, base + adjustment)


# --------------------------------------------------------------------------- #
# Per-bottle analytics
# --------------------------------------------------------------------------- #
def analyse_bottle(bottle: Bottle, year: int | None = None) -> BottleAnalytics:
    year = year or current_year()
    apogee = bottle.apogee_year or (bottle.drink_from + bottle.drink_to) // 2

    current_value = bottle.market_price_chf * bottle.quantity
    cost_basis = bottle.purchase_price_chf * bottle.quantity
    gain = current_value - cost_basis
    gain_pct = (gain / cost_basis) if cost_basis else 0.0

    d = drinkability(year, bottle.drink_from, bottle.drink_to, apogee, bottle.size)
    mu = effective_mu(bottle)
    years_to_apogee = apogee - year

    # Optimal holding horizon: ride appreciation to the apogee (capped), or a
    # short window if we're already past it but still inside the drinking band.
    if year < apogee:
        horizon = max(1, min(apogee - year, 10))
    elif year <= bottle.drink_to:
        horizon = max(1, min(bottle.drink_to - year, 5))
    else:
        horizon = 0

    projected_5y = current_value * math.exp(mu * 5)
    expected_future = current_value * math.exp(mu * horizon)
    cost_of_cork = max(0.0, expected_future - current_value)

    verdict = _verdict(year, bottle, apogee, mu)

    return BottleAnalytics(
        bottle=bottle,
        current_value_chf=round(current_value, 2),
        cost_basis_chf=round(cost_basis, 2),
        unrealized_gain_chf=round(gain, 2),
        unrealized_gain_pct=round(gain_pct, 4),
        drinkability=d,
        years_to_apogee=years_to_apogee,
        verdict=verdict,
        expected_annual_return=round(mu, 4),
        projected_value_5y_chf=round(projected_5y, 2),
        cost_of_cork_chf=round(cost_of_cork, 2),
    )


def _verdict(year: int, bottle: Bottle, apogee: int, mu: float) -> Verdict:
    if year < bottle.drink_from:
        return Verdict.LAY_DOWN
    if year > bottle.drink_to:
        return Verdict.PAST_PEAK
    # Inside the drinking window.
    if year < apogee:
        return Verdict.HOLD
    # At or past the apogee but still drinkable.
    if mu >= BENCHMARK_RETURN:
        return Verdict.SELL
    return Verdict.DRINK_NOW


# --------------------------------------------------------------------------- #
# Portfolio-level metrics
# --------------------------------------------------------------------------- #
def portfolio_metrics(bottles: list[Bottle], year: int | None = None) -> PortfolioMetrics:
    year = year or current_year()
    analytics = [analyse_bottle(b, year) for b in bottles]

    total_value = sum(a.current_value_chf for a in analytics)
    total_cost = sum(a.cost_basis_chf for a in analytics)
    gain = total_value - total_cost

    # Value-weighted expected return.
    if total_value > 0:
        exp_return = sum(a.expected_annual_return * a.current_value_chf for a in analytics) / total_value
    else:
        exp_return = 0.0

    # Region weights → portfolio volatility via the covariance matrix.
    region_value: dict[Region, float] = {}
    region_lots: dict[Region, int] = {}
    region_units: dict[Region, int] = {}
    for a in analytics:
        r = a.bottle.region
        region_value[r] = region_value.get(r, 0.0) + a.current_value_chf
        region_lots[r] = region_lots.get(r, 0) + 1
        region_units[r] = region_units.get(r, 0) + a.bottle.quantity

    weights = [region_value.get(r, 0.0) / total_value if total_value else 0.0 for r in REGIONS]
    cov = _covariance(REGIONS)
    variance = _quadratic_form(weights, cov)
    volatility = math.sqrt(max(variance, 0.0))

    # Concentration (Herfindahl over region weights) → diversification score.
    # HHI is only meaningful when the weights sum to 1; an empty cellar has
    # zero weights everywhere, so treat it as "not diversified" (0), not 1.
    hhi = sum(w * w for w in weights)
    diversification = 0.0 if total_value <= 0 else max(0.0, 1.0 - hhi)

    alpha = exp_return - BENCHMARK_RETURN
    sharpe = (exp_return - RISK_FREE_RATE) / volatility if volatility > 1e-9 else 0.0

    # 1-year 95% parametric VaR under a lognormal return.
    z95 = 1.6448536269514722
    worst_1y_factor = math.exp((exp_return - 0.5 * volatility ** 2) - z95 * volatility)
    var_chf = max(0.0, total_value * (1.0 - worst_1y_factor))

    projected_10y = total_value * math.exp(exp_return * 10)

    peak_soon = sum(
        a.current_value_chf
        for a in analytics
        if 0 <= (a.bottle.apogee_year or year) - year <= 5
    )

    allocation = sorted(
        (
            AllocationSlice(
                region=r,
                value_chf=round(region_value[r], 2),
                weight=round(region_value[r] / total_value if total_value else 0.0, 4),
                lots=region_lots[r],
                units=region_units[r],
            )
            for r in region_value
        ),
        key=lambda s: s.value_chf,
        reverse=True,
    )

    unique_labels = len({(b.name, b.vintage) for b in bottles})

    return PortfolioMetrics(
        total_value_chf=round(total_value, 2),
        total_cost_basis_chf=round(total_cost, 2),
        unrealized_gain_chf=round(gain, 2),
        unrealized_gain_pct=round(gain / total_cost if total_cost else 0.0, 4),
        lots=len(bottles),
        units=sum(b.quantity for b in bottles),
        unique_labels=unique_labels,
        cellar_alpha=round(alpha, 4),
        sharpe_ratio=round(sharpe, 3),
        expected_annual_return=round(exp_return, 4),
        volatility=round(volatility, 4),
        diversification_score=round(diversification, 4),
        value_at_risk_5pct_chf=round(var_chf, 2),
        projected_value_10y_chf=round(projected_10y, 2),
        peak_within_5y_value_chf=round(peak_soon, 2),
        allocation=allocation,
        benchmark_return=BENCHMARK_RETURN,
        risk_free_rate=RISK_FREE_RATE,
    )


# --------------------------------------------------------------------------- #
# Monte Carlo — correlated GBM across the whole cellar
# --------------------------------------------------------------------------- #
def monte_carlo(
    bottles: list[Bottle],
    horizon_years: int = 10,
    n_paths: int = 5000,
    seed: int = 42,
) -> MonteCarloResult:
    year0 = current_year()
    horizon_years = max(1, min(horizon_years, 30))
    n_paths = max(100, min(n_paths, 20_000))

    # Only simulate the regions actually held — cheaper Cholesky, same result.
    held = [r for r in REGIONS if any(b.region == r for b in bottles)]
    if not held or not bottles:
        years = list(range(year0, year0 + horizon_years + 1))
        zeros = [0.0] * len(years)
        return MonteCarloResult(
            horizon_years=horizon_years, n_paths=n_paths, seed=seed, years=years,
            p5=zeros, p25=zeros, p50=zeros, p75=zeros, p95=zeros,
            current_value_chf=0.0, expected_terminal_value_chf=0.0,
            best_case_chf=0.0, worst_case_chf=0.0, prob_profit=0.0,
        )

    idx = {r: i for i, r in enumerate(held)}
    chol = _cholesky(_corr_matrix(held))
    params = [REGION_PARAMS[r] for r in held]

    current_value = sum(b.market_price_chf * b.quantity for b in bottles)
    rng = random.Random(seed)

    # per_year[t] collects every path's total cellar value at year offset t.
    per_year: list[list[float]] = [[] for _ in range(horizon_years + 1)]
    terminals: list[float] = []

    for _ in range(n_paths):
        # Running value per bottle for this path.
        values = [b.market_price_chf * b.quantity for b in bottles]
        per_year[0].append(sum(values))
        for t in range(1, horizon_years + 1):
            # Correlated standard-normal shock, one component per held region.
            z = [rng.gauss(0.0, 1.0) for _ in held]
            corr_shock = [sum(chol[i][k] * z[k] for k in range(i + 1)) for i in range(len(held))]
            for bi, b in enumerate(bottles):
                p = params[idx[b.region]]
                shock = corr_shock[idx[b.region]]
                values[bi] *= math.exp((p.mu - 0.5 * p.sigma ** 2) + p.sigma * shock)
            per_year[t].append(sum(values))
        terminals.append(sum(values))

    def pct(sorted_vals: list[float], q: float) -> float:
        if not sorted_vals:
            return 0.0
        pos = q * (len(sorted_vals) - 1)
        lo = int(math.floor(pos))
        hi = min(lo + 1, len(sorted_vals) - 1)
        frac = pos - lo
        return sorted_vals[lo] * (1 - frac) + sorted_vals[hi] * frac

    p5, p25, p50, p75, p95 = [], [], [], [], []
    for t in range(horizon_years + 1):
        s = sorted(per_year[t])
        p5.append(round(pct(s, 0.05), 2))
        p25.append(round(pct(s, 0.25), 2))
        p50.append(round(pct(s, 0.50), 2))
        p75.append(round(pct(s, 0.75), 2))
        p95.append(round(pct(s, 0.95), 2))

    terminals_sorted = sorted(terminals)
    expected_terminal = sum(terminals) / len(terminals)
    prob_profit = sum(1 for v in terminals if v > current_value) / len(terminals)

    return MonteCarloResult(
        horizon_years=horizon_years,
        n_paths=n_paths,
        seed=seed,
        years=list(range(year0, year0 + horizon_years + 1)),
        p5=p5, p25=p25, p50=p50, p75=p75, p95=p95,
        current_value_chf=round(current_value, 2),
        expected_terminal_value_chf=round(expected_terminal, 2),
        best_case_chf=round(pct(terminals_sorted, 0.95), 2),
        worst_case_chf=round(pct(terminals_sorted, 0.05), 2),
        prob_profit=round(prob_profit, 4),
    )


# --------------------------------------------------------------------------- #
# Markowitz efficient frontier over the regions
# --------------------------------------------------------------------------- #
def efficient_frontier(bottles: list[Bottle], n_samples: int = 600, seed: int = 7) -> EfficientFrontier:
    regions = REGIONS
    mus = [REGION_PARAMS[r].mu for r in regions]
    sigmas = [REGION_PARAMS[r].sigma for r in regions]
    cov = _covariance(regions)
    rng = random.Random(seed)

    # Each region as a standalone asset.
    assets = [
        FrontierPoint(label=r.value, risk=round(sigmas[i], 4), ret=round(mus[i], 4))
        for i, r in enumerate(regions)
    ]

    # Random long-only portfolios on the simplex (exponential → Dirichlet(1)).
    cloud: list[FrontierPoint] = []
    for _ in range(max(50, min(n_samples, 3000))):
        raw = [-math.log(rng.random() or 1e-12) for _ in regions]
        s = sum(raw)
        w = [x / s for x in raw]
        ret = sum(w[i] * mus[i] for i in range(len(regions)))
        risk = math.sqrt(max(_quadratic_form(w, cov), 0.0))
        cloud.append(FrontierPoint(label="portfolio", risk=round(risk, 5), ret=round(ret, 5)))

    # Efficient frontier = upper envelope of the cloud (max return per risk bin).
    if cloud:
        risks = [p.risk for p in cloud]
        lo, hi = min(risks), max(risks)
        n_bins = 24
        width = (hi - lo) / n_bins or 1.0
        best: dict[int, FrontierPoint] = {}
        for p in cloud:
            b = min(n_bins - 1, int((p.risk - lo) / width))
            if b not in best or p.ret > best[b].ret:
                best[b] = p
        frontier = sorted(best.values(), key=lambda p: p.risk)
    else:
        frontier = []

    # Where the client's real cellar sits.
    total = sum(b.market_price_chf * b.quantity for b in bottles)
    if total > 0:
        weights = []
        for r in regions:
            v = sum(b.market_price_chf * b.quantity for b in bottles if b.region == r)
            weights.append(v / total)
        cellar_ret = sum(weights[i] * mus[i] for i in range(len(regions)))
        cellar_risk = math.sqrt(max(_quadratic_form(weights, cov), 0.0))
        cellar = FrontierPoint(label="Your Cellar", risk=round(cellar_risk, 5), ret=round(cellar_ret, 5))
    else:
        cellar = FrontierPoint(label="Your Cellar", risk=0.0, ret=0.0)

    return EfficientFrontier(assets=assets, cloud=cloud, frontier=frontier, cellar=cellar)


def correlation_matrix() -> CorrelationMatrix:
    labels = [r.value for r in REGIONS]
    matrix = [[round(_correlation(a, b), 3) for b in REGIONS] for a in REGIONS]
    return CorrelationMatrix(labels=labels, matrix=matrix)
