import type { BottleAnalytics } from "../types";

interface Props {
  bottles: BottleAnalytics[];
}

const VERDICT_COLOR: Record<string, string> = {
  "LAY DOWN": "#9a8be0",
  HOLD: "#c9a24b",
  SELL: "#43e0a3",
  "DRINK NOW": "#5fe3c0",
  "PAST PEAK": "#ff5d73",
};

const W = 900;
const LABEL_W = 186;
const ROW_H = 22;
const TOP = 16;
const BOTTOM = 26;

export default function MaturityHorizon({ bottles }: Props) {
  const rows = [...bottles].sort((a, b) => (a.bottle.apogee_year ?? 0) - (b.bottle.apogee_year ?? 0));
  const now = new Date().getFullYear();

  const minYear = Math.min(now, ...rows.map((r) => r.bottle.drink_from)) - 1;
  const maxYear = Math.max(now, ...rows.map((r) => r.bottle.drink_to)) + 1;
  const H = TOP + rows.length * ROW_H + BOTTOM;
  const plotL = LABEL_W;
  const plotR = W - 18;
  const x = (yr: number) => plotL + ((yr - minYear) / (maxYear - minYear)) * (plotR - plotL);

  const decades: number[] = [];
  for (let d = Math.ceil(minYear / 10) * 10; d <= maxYear; d += 10) decades.push(d);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ fontSize: 9 }}>
      {/* decade gridlines */}
      {decades.map((d) => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={TOP} y2={H - BOTTOM} stroke="rgba(255,255,255,0.05)" />
          <text x={x(d)} y={H - 10} textAnchor="middle" className="axis-label">
            {d}
          </text>
        </g>
      ))}

      {/* rows */}
      {rows.map((r, i) => {
        const cy = TOP + i * ROW_H + ROW_H / 2;
        const color = VERDICT_COLOR[r.verdict] ?? "#c9a24b";
        const apogee = r.bottle.apogee_year ?? (r.bottle.drink_from + r.bottle.drink_to) / 2;
        return (
          <g key={r.bottle.id}>
            <text x={10} y={cy + 3} className="axis-label" fill="#c7ccdb">
              {r.bottle.name.length > 24 ? r.bottle.name.slice(0, 23) + "…" : r.bottle.name}
              <tspan fill="#626a7e"> ’{String(r.bottle.vintage).slice(2)}</tspan>
            </text>
            {/* window bar */}
            <rect
              x={x(r.bottle.drink_from)}
              y={cy - 4}
              width={Math.max(2, x(r.bottle.drink_to) - x(r.bottle.drink_from))}
              height={8}
              rx={4}
              fill={color}
              fillOpacity={0.22}
              stroke={color}
              strokeOpacity={0.5}
              strokeWidth={0.8}
            >
              <title>
                {r.bottle.name} — drink {r.bottle.drink_from}–{r.bottle.drink_to}, peak {apogee} · {r.verdict}
              </title>
            </rect>
            {/* apogee marker */}
            <rect
              x={x(apogee) - 3.5}
              y={cy - 3.5}
              width={7}
              height={7}
              fill={color}
              transform={`rotate(45 ${x(apogee)} ${cy})`}
            />
          </g>
        );
      })}

      {/* NOW line */}
      <line x1={x(now)} x2={x(now)} y1={TOP - 6} y2={H - BOTTOM} stroke="#e3c473" strokeWidth={1.3} strokeDasharray="2 3" />
      <rect x={x(now) - 18} y={TOP - 18} width={36} height={13} rx={3} fill="#e3c473" />
      <text x={x(now)} y={TOP - 8.5} textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 700 }} fill="#0e111c">
        Now
      </text>
    </svg>
  );
}
