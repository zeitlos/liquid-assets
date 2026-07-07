import type { MarketIndex } from "../types";
import { signedPct } from "../format";

interface Props {
  indices: MarketIndex[];
}

export default function Ticker({ indices }: Props) {
  if (!indices.length) return null;
  // Duplicate the set so the marquee can loop seamlessly.
  const items = [...indices, ...indices];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((ix, i) => {
          const up = ix.change_pct >= 0;
          return (
            <span className="tick" key={`${ix.symbol}-${i}`}>
              <span className="sym">{ix.symbol}</span>
              <span className="lvl">{ix.level.toFixed(2)}</span>
              <span className={`arrow ${up ? "pos" : "neg"}`}>{up ? "▲" : "▼"}</span>
              <span className={up ? "pos mono" : "neg mono"} style={{ fontSize: 12.5 }}>
                {signedPct(ix.change_pct)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
