import { useEffect, useRef, useState } from "react";
import type { MonteCarloResult } from "../types";
import { chfCompact, num, pct } from "../format";
import MonteCarloChart from "./MonteCarloChart";

interface Props {
  mc: MonteCarloResult | null;
  onRun: (horizon: number, paths: number, seed: number) => Promise<void>;
}

export default function SimulationPanel({ mc, onRun }: Props) {
  const [horizon, setHorizon] = useState(10);
  const [paths, setPaths] = useState(5000);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function run() {
    if (running) return;
    setRunning(true);
    setProgress(0);
    const start = performance.now();
    const animate = (ts: number) => {
      // Ease toward 92% over ~1.4s; the resolve pushes it to 100%.
      const t = Math.min(1, (ts - start) / 1400);
      setProgress(Math.min(0.92, 1 - Math.pow(1 - t, 2)));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    try {
      await onRun(horizon, paths, seed);
      await new Promise((r) => setTimeout(r, 220)); // let the bar breathe
    } finally {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(1);
      setTimeout(() => setRunning(false), 260);
    }
  }

  const spooled = Math.round(progress * paths);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">
            <span className="dot" /> Monte-Carlo Valuation Cone
          </div>
          <div className="panel-sub">
            Correlated geometric-Brownian-motion simulation of the cellar's value across every held
            region. Shaded cones are 50% and 90% confidence.
          </div>
        </div>
        <div className="panel-badge">GBM · Cholesky</div>
      </div>

      <div className="sim-controls">
        <div className="field">
          <label>
            Horizon <span className="field-val">{horizon}y</span>
          </label>
          <input
            type="range"
            min={1}
            max={30}
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>
            Paths <span className="field-val">{num(paths)}</span>
          </label>
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={paths}
            onChange={(e) => setPaths(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label>
            Seed <span className="field-val">{seed}</span>
          </label>
          <button className="btn ghost" style={{ padding: "6px 12px" }} onClick={() => setSeed(Math.floor(Math.random() * 99999))}>
            🎲 reseed
          </button>
        </div>
        <button className="btn primary" onClick={run} disabled={running}>
          {running ? "▶ computing…" : "▶ run simulation"}
        </button>
      </div>

      {running && (
        <div style={{ margin: "10px 0 4px" }}>
          <div className="compute">
            SPOOLING PATH {num(spooled)} / {num(paths)} · CHOLESKY-CORRELATED SHOCKS
          </div>
          <div className="compute-bar">
            <i style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      {mc ? (
        <MonteCarloChart mc={mc} />
      ) : (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-faint)" }}>
          Run the engine to project the valuation cone.
        </div>
      )}

      {mc && (
        <div className="sim-readout">
          <div className="readout">
            <span className="r-label">Expected Terminal</span>
            <span className="r-value gold">{chfCompact(mc.expected_terminal_value_chf)}</span>
          </div>
          <div className="readout">
            <span className="r-label">Median Outcome</span>
            <span className="r-value">{chfCompact(mc.p50[mc.p50.length - 1])}</span>
          </div>
          <div className="readout">
            <span className="r-label">Bull Case (P95)</span>
            <span className="r-value pos">{chfCompact(mc.best_case_chf)}</span>
          </div>
          <div className="readout">
            <span className="r-label">Bear Case (P5)</span>
            <span className="r-value neg">{chfCompact(mc.worst_case_chf)}</span>
          </div>
          <div className="readout">
            <span className="r-label">P(profit)</span>
            <span className="r-value">{pct(mc.prob_profit, 0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
