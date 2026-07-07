import type { AllocationSlice } from "../types";
import { chfCompact, pct } from "../format";

interface Props {
  slices: AllocationSlice[];
}

export default function Allocation({ slices }: Props) {
  const maxW = Math.max(...slices.map((s) => s.weight), 0.0001);
  return (
    <div>
      {slices.map((s) => (
        <div className="alloc-row" key={s.region}>
          <div className="alloc-region">
            {s.region}
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>
              {s.lots} lots · {s.units} btl
            </div>
          </div>
          <div className="alloc-track">
            <div className="alloc-fill" style={{ width: `${(s.weight / maxW) * 100}%` }} />
          </div>
          <div className="alloc-val">
            {chfCompact(s.value_chf)}
            <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{pct(s.weight)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
