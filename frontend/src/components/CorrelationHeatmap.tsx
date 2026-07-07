import { useState } from "react";
import type { CorrelationMatrix } from "../types";

interface Props {
  cm: CorrelationMatrix;
}

const CELL = 30;
const LEFT = 54;
const TOP = 58;

export default function CorrelationHeatmap({ cm }: Props) {
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const n = cm.labels.length;
  const W = LEFT + n * CELL + 12;
  const H = TOP + n * CELL + 14;
  const abbr = (s: string) => s.slice(0, 4);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ fontSize: 8 }} onMouseLeave={() => setHover(null)}>
        {/* column labels */}
        {cm.labels.map((l, j) => (
          <text
            key={`c${j}`}
            transform={`translate(${LEFT + j * CELL + CELL / 2}, ${TOP - 8}) rotate(-45)`}
            className="axis-label"
            fill="#8b93a7"
          >
            {abbr(l)}
          </text>
        ))}
        {/* row labels */}
        {cm.labels.map((l, i) => (
          <text key={`r${i}`} x={LEFT - 8} y={TOP + i * CELL + CELL / 2 + 3} textAnchor="end" className="axis-label" fill="#8b93a7">
            {abbr(l)}
          </text>
        ))}
        {/* cells */}
        {cm.matrix.map((row, i) =>
          row.map((v, j) => {
            const active = hover && hover.i === i && hover.j === j;
            return (
              <rect
                key={`${i}-${j}`}
                x={LEFT + j * CELL + 1}
                y={TOP + i * CELL + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx={3}
                fill={`rgba(201,162,75,${0.06 + v * 0.78})`}
                stroke={active ? "#eccd74" : "transparent"}
                strokeWidth={1.4}
                onMouseEnter={() => setHover({ i, j })}
              />
            );
          })
        )}
      </svg>
      <div className="legend" style={{ justifyContent: "space-between" }}>
        <span style={{ color: "var(--text-faint)" }}>
          {hover
            ? `${cm.labels[hover.i]} × ${cm.labels[hover.j]} · ρ = ${cm.matrix[hover.i][hover.j].toFixed(2)}`
            : "single-factor correlation model · ρ = bᵢ·bⱼ"}
        </span>
        <span>
          <i style={{ background: "rgba(201,162,75,0.15)" }} /> low
          <i style={{ background: "rgba(201,162,75,0.84)", marginLeft: 8 }} /> high
        </span>
      </div>
    </div>
  );
}
