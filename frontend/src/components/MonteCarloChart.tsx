import { useState } from "react";
import type { MonteCarloResult } from "../types";
import { chfCompact } from "../format";

interface Props {
  mc: MonteCarloResult;
}

const W = 900;
const H = 380;
const M = { top: 18, right: 22, bottom: 36, left: 70 };

export default function MonteCarloChart({ mc }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const n = mc.years.length;
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const yMin = Math.min(...mc.p5, mc.current_value_chf) * 0.96;
  const yMax = Math.max(...mc.p95) * 1.04;

  const x = (i: number) => M.left + (i / (n - 1)) * plotW;
  const y = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const band = (lo: number[], hi: number[]) => {
    const top = hi.map((v, i) => `${x(i)},${y(v)}`).join(" L");
    const bot = lo
      .map((v, i) => `${x(n - 1 - i)},${y(lo[n - 1 - i])}`)
      .join(" L");
    return `M${top} L${bot} Z`;
  };

  const line = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const yTicks = 5;
  const ticks = Array.from({ length: yTicks }, (_, i) => yMin + ((yMax - yMin) * i) / (yTicks - 1));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((mx - M.left) / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fanOuter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c0405f" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c0405f" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="fanInner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eccd74" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#eccd74" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(t)}
              y2={y(t)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text x={M.left - 10} y={y(t) + 3} textAnchor="end" className="axis-label">
              {chfCompact(t)}
            </text>
          </g>
        ))}

        {/* baseline: today's value */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={y(mc.current_value_chf)}
          y2={y(mc.current_value_chf)}
          stroke="rgba(255,255,255,0.3)"
          strokeDasharray="3 4"
          strokeWidth={1}
        />

        {/* confidence bands */}
        <path d={band(mc.p5, mc.p95)} fill="url(#fanOuter)" />
        <path d={band(mc.p25, mc.p75)} fill="url(#fanInner)" />

        {/* median */}
        <path d={line(mc.p50)} fill="none" stroke="#eccd74" strokeWidth={2.2} />
        <path
          d={line(mc.p95)}
          fill="none"
          stroke="#c0405f"
          strokeWidth={1}
          strokeOpacity={0.5}
          strokeDasharray="2 3"
        />
        <path
          d={line(mc.p5)}
          fill="none"
          stroke="#c0405f"
          strokeWidth={1}
          strokeOpacity={0.5}
          strokeDasharray="2 3"
        />

        {/* x axis labels */}
        {mc.years.map((yr, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text key={yr} x={x(i)} y={H - 12} textAnchor="middle" className="axis-label">
              {yr}
            </text>
          ) : null
        )}

        {/* hover crosshair */}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={M.top}
              y2={M.top + plotH}
              stroke="rgba(236,205,116,0.5)"
              strokeWidth={1}
            />
            <circle cx={x(hover)} cy={y(mc.p50[hover])} r={4} fill="#eccd74" />
            <circle cx={x(hover)} cy={y(mc.p95[hover])} r={3} fill="#c0405f" />
            <circle cx={x(hover)} cy={y(mc.p5[hover])} r={3} fill="#c0405f" />
            <g transform={`translate(${Math.min(x(hover) + 12, W - 150)}, ${M.top + 6})`}>
              <rect width={140} height={64} rx={7} fill="#0e111c" stroke="rgba(201,162,75,0.3)" />
              <text x={10} y={18} className="axis-label" fill="#8b93a7">
                {mc.years[hover]}
              </text>
              <text x={10} y={35} className="axis-label" fill="#eccd74">
                P50 {chfCompact(mc.p50[hover])}
              </text>
              <text x={10} y={49} className="axis-label" fill="#c0405f">
                P95 {chfCompact(mc.p95[hover])}
              </text>
              <text x={10} y={60} className="axis-label" fill="#c0405f">
                P5 {chfCompact(mc.p5[hover])}
              </text>
            </g>
          </g>
        )}
      </svg>

      <div className="legend">
        <span>
          <i style={{ background: "#eccd74" }} /> Median (P50)
        </span>
        <span>
          <i style={{ background: "#eecd7455" }} /> Interquartile (P25–P75)
        </span>
        <span>
          <i style={{ background: "#c0405f55" }} /> 90% cone (P5–P95)
        </span>
        <span>
          <i style={{ background: "rgba(255,255,255,0.4)" }} /> Value today
        </span>
      </div>
    </div>
  );
}
