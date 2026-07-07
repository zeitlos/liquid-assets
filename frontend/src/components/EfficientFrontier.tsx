import { useState } from "react";
import type { EfficientFrontier as EF, FrontierPoint } from "../types";
import { pct } from "../format";

interface Props {
  ef: EF;
}

const W = 620;
const H = 420;
const M = { top: 20, right: 20, bottom: 44, left: 54 };

export default function EfficientFrontier({ ef }: Props) {
  const [hover, setHover] = useState<{ x: number; y: number; label: string; r: number; ret: number } | null>(
    null
  );

  const all = [...ef.cloud, ...ef.assets, ...ef.frontier, ef.cellar];
  const risks = all.map((p) => p.risk);
  const rets = all.map((p) => p.ret);
  const rMin = 0;
  const rMax = Math.max(...risks) * 1.08;
  const retMin = Math.min(...rets) * 0.9;
  const retMax = Math.max(...rets) * 1.06;

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const x = (r: number) => M.left + ((r - rMin) / (rMax - rMin)) * plotW;
  const y = (ret: number) => M.top + plotH - ((ret - retMin) / (retMax - retMin)) * plotH;

  const frontierPath = ef.frontier
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.risk)},${y(p.ret)}`)
    .join(" ");

  const xTicks = 5;
  const yTicks = 5;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        style={{ fontSize: 12 }}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid */}
        {Array.from({ length: yTicks }, (_, i) => {
          const ret = retMin + ((retMax - retMin) * i) / (yTicks - 1);
          return (
            <g key={`y${i}`}>
              <line x1={M.left} x2={W - M.right} y1={y(ret)} y2={y(ret)} stroke="rgba(255,255,255,0.05)" />
              <text x={M.left - 8} y={y(ret) + 3} textAnchor="end" className="axis-label">
                {pct(ret, 0)}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks }, (_, i) => {
          const r = rMin + ((rMax - rMin) * i) / (xTicks - 1);
          return (
            <text key={`x${i}`} x={x(r)} y={H - 24} textAnchor="middle" className="axis-label">
              {pct(r, 0)}
            </text>
          );
        })}
        <text x={M.left + plotW / 2} y={H - 6} textAnchor="middle" className="axis-label" fill="var(--text-faint)">
          Risk — annualised volatility
        </text>
        <text
          transform={`translate(15, ${M.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="axis-label"
          fill="var(--text-faint)"
        >
          Expected return
        </text>

        {/* random-portfolio cloud */}
        {ef.cloud.map((p, i) => (
          <circle key={i} cx={x(p.risk)} cy={y(p.ret)} r={1.6} fill="rgba(154,139,224,0.32)" />
        ))}

        {/* efficient frontier */}
        <path d={frontierPath} fill="none" stroke="#5fe3c0" strokeWidth={2} />

        {/* individual regions */}
        {ef.assets.map((p) => (
          <g
            key={p.label}
            onMouseEnter={() =>
              setHover({ x: x(p.risk), y: y(p.ret), label: p.label, r: p.risk, ret: p.ret })
            }
          >
            <circle cx={x(p.risk)} cy={y(p.ret)} r={4} fill="#c9a24b" stroke="#0e111c" strokeWidth={1} />
            <text x={x(p.risk) + 7} y={y(p.ret) + 3} className="axis-label" fill="#8b93a7">
              {p.label}
            </text>
          </g>
        ))}

        {/* the client's cellar */}
        <g
          onMouseEnter={() =>
            setHover({
              x: x(ef.cellar.risk),
              y: y(ef.cellar.ret),
              label: "Your Cellar",
              r: ef.cellar.risk,
              ret: ef.cellar.ret,
            })
          }
        >
          <circle cx={x(ef.cellar.risk)} cy={y(ef.cellar.ret)} r={10} fill="none" stroke="#c0405f" strokeWidth={1.5} strokeOpacity={0.5} />
          <circle cx={x(ef.cellar.risk)} cy={y(ef.cellar.ret)} r={5.5} fill="#c0405f" />
          <text x={x(ef.cellar.risk) + 14} y={y(ef.cellar.ret) - 9} className="axis-label" fill="#eceef5">
            Your cellar
          </text>
        </g>

        {hover && (
          <g transform={`translate(${Math.min(hover.x + 10, W - 130)}, ${Math.max(hover.y - 40, 6)})`}>
            <rect width={122} height={40} rx={6} fill="#0e111c" stroke="rgba(201,162,75,0.3)" />
            <text x={9} y={16} className="axis-label" fill="#e8eaf3">
              {hover.label}
            </text>
            <text x={9} y={31} className="axis-label" fill="#8b93a7">
              μ {pct(hover.ret, 1)} · σ {pct(hover.r, 1)}
            </text>
          </g>
        )}
      </svg>

      <div className="legend">
        <span>
          <i className="dotm" style={{ background: "#5fe3c0" }} /> Efficient frontier
        </span>
        <span>
          <i className="dotm" style={{ background: "#c9a24b" }} /> Region
        </span>
        <span>
          <i className="dotm" style={{ background: "#9a8be0" }} /> Random portfolio
        </span>
        <span>
          <i className="dotm" style={{ background: "#c0405f" }} /> Your cellar
        </span>
      </div>
    </div>
  );
}
