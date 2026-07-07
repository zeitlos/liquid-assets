import { useState } from "react";
import type { BottleAnalytics } from "../types";
import { chf, chfCompact, signedPct } from "../format";

interface Props {
  bottles: BottleAnalytics[];
}

type SortKey = "value" | "cork" | "drinkability" | "gain";

const slug = (verdict: string) => `v-${verdict.toLowerCase().replace(/\s+/g, "-")}`;
const pretty = (verdict: string) => verdict.charAt(0) + verdict.slice(1).toLowerCase();

export default function VerdictTable({ bottles }: Props) {
  const [sort, setSort] = useState<SortKey>("value");

  const sorted = [...bottles].sort((a, b) => {
    switch (sort) {
      case "cork":
        return b.cost_of_cork_chf - a.cost_of_cork_chf;
      case "drinkability":
        return b.drinkability - a.drinkability;
      case "gain":
        return b.unrealized_gain_pct - a.unrealized_gain_pct;
      default:
        return b.current_value_chf - a.current_value_chf;
    }
  });

  const th = (key: SortKey, label: string) => (
    <th
      style={{ cursor: "pointer", color: sort === key ? "var(--gold-bright)" : undefined }}
      onClick={() => setSort(key)}
    >
      {label} {sort === key ? "▾" : ""}
    </th>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="vtable">
        <thead>
          <tr>
            <th>Lot</th>
            <th>Region</th>
            <th style={{ textAlign: "left" }}>Drinkability</th>
            <th>Verdict</th>
            {th("value", "Value")}
            {th("gain", "Gain")}
            {th("cork", "Cost of Cork™")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const gainUp = a.unrealized_gain_pct >= 0;
            return (
              <tr key={a.bottle.id}>
                <td style={{ textAlign: "left" }}>
                  <div className="wine-name">{a.bottle.name}</div>
                  <div className="wine-meta">
                    {a.bottle.producer} · {a.bottle.vintage} · {a.bottle.quantity}× {a.bottle.size.split(" ")[0]}
                  </div>
                </td>
                <td>{a.bottle.region}</td>
                <td style={{ textAlign: "left" }}>
                  <span className="dmeter">
                    <i style={{ width: `${a.drinkability * 100}%` }} />
                  </span>
                  <span style={{ marginLeft: 8, color: "var(--text-dim)" }}>
                    {(a.drinkability * 100).toFixed(0)}
                  </span>
                </td>
                <td>
                  <span className={`verdict-tag ${slug(a.verdict)}`}>{pretty(a.verdict)}</span>
                </td>
                <td>{chf(a.current_value_chf)}</td>
                <td className={gainUp ? "pos" : "neg"}>{signedPct(a.unrealized_gain_pct)}</td>
                <td style={{ color: a.cost_of_cork_chf > 20000 ? "var(--gold-bright)" : undefined }}>
                  {a.cost_of_cork_chf > 0 ? chfCompact(a.cost_of_cork_chf) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
