import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type {
  BottleAnalytics,
  CorrelationMatrix,
  EfficientFrontier as EFType,
  MarketPulse,
  MonteCarloResult,
  PortfolioMetrics,
} from "./types";
import { chfCompact } from "./format";

import BootSequence from "./components/BootSequence";
import Ticker from "./components/Ticker";
import KpiRow from "./components/KpiRow";
import SimulationPanel from "./components/SimulationPanel";
import EfficientFrontier from "./components/EfficientFrontier";
import MaturityHorizon from "./components/MaturityHorizon";
import CorrelationHeatmap from "./components/CorrelationHeatmap";
import Allocation from "./components/Allocation";
import VerdictTable from "./components/VerdictTable";
import AddBottleModal from "./components/AddBottleModal";

export default function App() {
  const [bootDone, setBootDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [portfolio, setPortfolio] = useState<PortfolioMetrics | null>(null);
  const [bottles, setBottles] = useState<BottleAnalytics[]>([]);
  const [frontier, setFrontier] = useState<EFType | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(null);
  const [market, setMarket] = useState<MarketPulse | null>(null);
  const [mc, setMc] = useState<MonteCarloResult | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [clock, setClock] = useState(new Date());
  const lastSim = useRef({ horizon: 10, paths: 5000, seed: 42 });

  const loadAnalytics = useCallback(async () => {
    const [p, b, f, c] = await Promise.all([
      api.portfolio(),
      api.bottles(),
      api.frontier(),
      api.correlation(),
    ]);
    setPortfolio(p);
    setBottles(b);
    setFrontier(f);
    setCorrelation(c);
  }, []);

  const runSim = useCallback(async (horizon: number, paths: number, seed: number) => {
    lastSim.current = { horizon, paths, seed };
    const result = await api.simulate(horizon, paths, seed);
    setMc(result);
  }, []);

  // Initial load. Only the core analytics are fatal; the engine simulation and
  // market feed are non-fatal, so a transient failure there can't pin an error
  // screen over an otherwise-working dashboard.
  useEffect(() => {
    (async () => {
      try {
        await loadAnalytics();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reach the Œnometric Engine.");
        return;
      }
      try {
        await runSim(10, 5000, 42);
      } catch {
        /* the Run Simulation button stays available */
      }
      try {
        setMarket(await api.market());
      } catch {
        /* the ticker simply stays empty */
      }
    })();
  }, [loadAnalytics, runSim]);

  // Live market feed — drifts every few seconds.
  useEffect(() => {
    const id = setInterval(() => {
      api.market().then(setMarket).catch(() => {});
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Clock.
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function onAdded() {
    await loadAnalytics();
    const s = lastSim.current;
    await runSim(s.horizon, s.paths, s.seed);
  }

  const ready = portfolio !== null && frontier !== null && correlation !== null;

  return (
    <>
      {(!bootDone || !ready) && <BootSequence onComplete={() => setBootDone(true)} />}

      {error && !ready && (
        <div className="app" style={{ paddingTop: 120, textAlign: "center" }}>
          <div className="panel" style={{ maxWidth: 460, margin: "0 auto" }}>
            <div className="panel-title" style={{ justifyContent: "center" }}>
              Engine unreachable
            </div>
            <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{error}</p>
            <p style={{ color: "var(--text-faint)", fontSize: 12 }}>
              Is the API running on <span className="mono">:8000</span>?
            </p>
          </div>
        </div>
      )}

      {ready && portfolio && frontier && correlation && (
        <div className="app fadein">
          {/* ---- top bar ---- */}
          <div className="topbar">
            <div className="brand">
              <span className="brand-name">
                Liquid <b>Assets</b>
                <span className="brand-tm">™</span>
              </span>
              <span className="brand-tag">Passion-Asset Desk · Œnometric Engine</span>
            </div>
            <div className="topbar-right">
              {market && (
                <div className="status-cluster">
                  <span className={`led ${market.sentiment === "Bearish" ? "amber" : ""}`} />
                  <span className="status-label">Market · {market.sentiment}</span>
                </div>
              )}
              <div className="status-cluster">
                <span className="led" />
                <span className="status-label">Engine Online</span>
              </div>
              <span className="clock">{clock.toLocaleTimeString("en-GB")}</span>
              <button className="btn" onClick={() => setShowModal(true)}>
                Add lot
              </button>
            </div>
          </div>

          {market && <Ticker indices={market.indices} />}

          <KpiRow p={portfolio} mc={mc} />

          {/* ---- simulation + frontier ---- */}
          <div className="grid grid-2 section-gap">
            <SimulationPanel mc={mc} onRun={runSim} />
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">
                    Efficient Frontier
                  </div>
                  <div className="panel-sub">
                    Markowitz mean-variance optimisation across regions. Your cellar plotted against the
                    optimal risk/return envelope.
                  </div>
                </div>
                <div className="panel-badge">Mean-Variance</div>
              </div>
              <EfficientFrontier ef={frontier} />
            </div>
          </div>

          {/* ---- maturity horizon ---- */}
          <div className="panel section-gap">
            <div className="panel-head">
              <div>
                <div className="panel-title">
                  Maturity Horizon
                </div>
                <div className="panel-sub">
                  Drinking window and peak-maturity point for every lot, coloured by verdict.
                  The dashed line marks today.
                </div>
              </div>
              <div className="panel-badge">Drink-Window Model</div>
            </div>
            <MaturityHorizon bottles={bottles} />
          </div>

          {/* ---- correlation + allocation ---- */}
          <div className="grid grid-2-even section-gap">
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">
                    Regional Correlation
                  </div>
                  <div className="panel-sub">How tightly regional prices move together — the raw input to portfolio risk.</div>
                </div>
              </div>
              <CorrelationHeatmap cm={correlation} />
            </div>
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">
                    Allocation by Region
                  </div>
                  <div className="panel-sub">
                    Concentration matters — diversification score {(portfolio.diversification_score * 100).toFixed(0)} / 100.
                  </div>
                </div>
                <div className="panel-badge">{chfCompact(portfolio.total_value_chf)}</div>
              </div>
              <Allocation slices={portfolio.allocation} />
            </div>
          </div>

          {/* ---- verdict table ---- */}
          <div className="panel section-gap">
            <div className="panel-head">
              <div>
                <div className="panel-title">
                  Drink · Hold · Sell — Lot-Level Verdicts
                </div>
                <div className="panel-sub">
                  The engine's recommendation per lot. <b>Cost of Cork™</b> is the expected appreciation
                  forfeited by drinking the whole lot today.
                </div>
              </div>
              <div className="panel-badge">{bottles.length} lots</div>
            </div>
            <VerdictTable bottles={bottles} />
          </div>

          <div className="footer">
            Liquid Assets™ · Œnometric Engine v1.0 · A citizen-development project
            <div className="disc">
              For demonstration only. Not investment advice, and definitely not a substitute for
              actually drinking the wine. Past performance is no guarantee of future vintages.
            </div>
          </div>
        </div>
      )}

      {showModal && <AddBottleModal onClose={() => setShowModal(false)} onAdded={onAdded} />}
    </>
  );
}
