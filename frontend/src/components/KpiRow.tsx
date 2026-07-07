import type { CSSProperties } from "react";
import type { MonteCarloResult, PortfolioMetrics } from "../types";
import { chf, chfCompact, num, pct, signedPct } from "../format";
import AnimatedNumber from "./AnimatedNumber";

interface Props {
  p: PortfolioMetrics;
  mc: MonteCarloResult | null;
}

export default function KpiRow({ p, mc }: Props) {
  const gainUp = p.unrealized_gain_pct >= 0;
  const alphaUp = p.cellar_alpha >= 0;

  return (
    <div className="kpi-row">
      <div className="kpi" style={{ "--glow": "rgba(201,162,75,0.22)" } as CSSProperties}>
        <div className="kpi-label">Total Cellar Valuation</div>
        <div className="kpi-value gold">
          <AnimatedNumber value={p.total_value_chf} format={(n) => chf(n)} />
        </div>
        <div className="kpi-foot">
          <span className={`chip ${gainUp ? "pos" : "neg"}`}>{signedPct(p.unrealized_gain_pct)}</span>
          <span>unrealised · basis {chfCompact(p.total_cost_basis_chf)}</span>
        </div>
      </div>

      <div className="kpi" style={{ "--glow": "rgba(67,224,163,0.18)" } as CSSProperties}>
        <div className="kpi-label">Cellar Alpha</div>
        <div className={`kpi-value ${alphaUp ? "pos" : "neg"}`}>
          <AnimatedNumber value={p.cellar_alpha} format={(n) => signedPct(n)} />
        </div>
        <div className="kpi-foot">vs Liv-ex 100 · benchmark {pct(p.benchmark_return)}</div>
      </div>

      <div className="kpi" style={{ "--glow": "rgba(192,64,95,0.2)" } as CSSProperties}>
        <div className="kpi-label">Projected 10-Yr AUM</div>
        <div className="kpi-value">
          <AnimatedNumber value={p.projected_value_10y_chf} format={(n) => chfCompact(n)} />
        </div>
        <div className="kpi-foot">at {pct(p.expected_annual_return)} expected p.a.</div>
      </div>

      <div className="kpi" style={{ "--glow": "rgba(95,227,192,0.18)" } as CSSProperties}>
        <div className="kpi-label">Risk-Adjusted (Sharpe)</div>
        <div className="kpi-value">
          <AnimatedNumber value={p.sharpe_ratio} format={(n) => n.toFixed(2)} />
        </div>
        <div className="kpi-foot">σ {pct(p.volatility)} · VaR {chfCompact(p.value_at_risk_5pct_chf)}</div>
      </div>

      <div className="kpi" style={{ "--glow": "rgba(154,139,224,0.2)" } as CSSProperties}>
        <div className="kpi-label">Probability of Profit</div>
        <div className="kpi-value">
          {mc ? <AnimatedNumber value={mc.prob_profit} format={(n) => pct(n, 0)} /> : "—"}
        </div>
        <div className="kpi-foot">
          {mc ? `${mc.horizon_years}y horizon · ${num(mc.n_paths)} paths` : "run a simulation"}
        </div>
      </div>
    </div>
  );
}
