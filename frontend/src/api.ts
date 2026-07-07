import type {
  BottleAnalytics,
  CorrelationMatrix,
  EfficientFrontier,
  MarketPulse,
  MonteCarloResult,
  NewBottle,
  PortfolioMetrics,
} from "./types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  portfolio: () => get<PortfolioMetrics>("/analytics/portfolio"),
  bottles: () => get<BottleAnalytics[]>("/analytics/bottles"),
  frontier: () => get<EfficientFrontier>("/analytics/frontier"),
  correlation: () => get<CorrelationMatrix>("/analytics/correlation"),
  market: () => get<MarketPulse>("/market/pulse"),
  simulate: (horizon_years: number, n_paths: number, seed: number) =>
    post<MonteCarloResult>("/engine/simulate", { horizon_years, n_paths, seed }),
  addBottle: (bottle: NewBottle) => post("/cellar/bottles", bottle),
};
