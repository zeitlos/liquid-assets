// Mirrors the Pydantic models served by the Œnometric Engine.

export type Verdict = "LAY DOWN" | "HOLD" | "SELL" | "DRINK NOW" | "PAST PEAK";

export interface Bottle {
  id: string;
  name: string;
  producer: string;
  region: string;
  vintage: number;
  quantity: number;
  size: string;
  purchase_price_chf: number;
  market_price_chf: number;
  purchase_date: string;
  drink_from: number;
  drink_to: number;
  apogee_year: number;
  critic_score: number;
  notes?: string | null;
}

export interface BottleAnalytics {
  bottle: Bottle;
  current_value_chf: number;
  cost_basis_chf: number;
  unrealized_gain_chf: number;
  unrealized_gain_pct: number;
  drinkability: number;
  years_to_apogee: number;
  verdict: Verdict;
  expected_annual_return: number;
  projected_value_5y_chf: number;
  cost_of_cork_chf: number;
}

export interface AllocationSlice {
  region: string;
  value_chf: number;
  weight: number;
  lots: number;
  units: number;
}

export interface PortfolioMetrics {
  total_value_chf: number;
  total_cost_basis_chf: number;
  unrealized_gain_chf: number;
  unrealized_gain_pct: number;
  lots: number;
  units: number;
  unique_labels: number;
  cellar_alpha: number;
  sharpe_ratio: number;
  expected_annual_return: number;
  volatility: number;
  diversification_score: number;
  value_at_risk_5pct_chf: number;
  projected_value_10y_chf: number;
  peak_within_5y_value_chf: number;
  allocation: AllocationSlice[];
  benchmark_return: number;
  risk_free_rate: number;
}

export interface MonteCarloResult {
  horizon_years: number;
  n_paths: number;
  seed: number;
  years: number[];
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  current_value_chf: number;
  expected_terminal_value_chf: number;
  best_case_chf: number;
  worst_case_chf: number;
  prob_profit: number;
}

export interface FrontierPoint {
  label: string;
  risk: number;
  ret: number;
}

export interface EfficientFrontier {
  assets: FrontierPoint[];
  cloud: FrontierPoint[];
  frontier: FrontierPoint[];
  cellar: FrontierPoint;
}

export interface CorrelationMatrix {
  labels: string[];
  matrix: number[][];
}

export interface MarketIndex {
  name: string;
  symbol: string;
  level: number;
  change_pct: number;
  spark: number[];
}

export interface MarketPulse {
  as_of: string;
  sentiment: string;
  indices: MarketIndex[];
}

export interface NewBottle {
  name: string;
  producer: string;
  region: string;
  vintage: number;
  quantity: number;
  size: string;
  purchase_price_chf: number;
  market_price_chf: number;
  purchase_date: string;
  drink_from: number;
  drink_to: number;
  critic_score: number;
  notes?: string;
}
