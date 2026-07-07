import { useEffect, useRef, useState } from "react";

const LINES = [
  "Initialising Œnometric Engine core",
  "Calibrating tannin-decay tensors",
  "Loading Liv-ex market microstructure",
  "Mounting cellar volume · /data",
  "Factorising regional correlation matrix",
  "Spooling 5,000 Monte-Carlo paths",
  "Solving Markowitz efficient frontier",
  "Engine online — good afternoon, Relationship Manager",
];

interface Props {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: Props) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  // Keep the latest callback without letting its identity restart the timers:
  // the parent re-renders every second (clock), which would otherwise reset the
  // whole boot sequence on every tick.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setShown(i + 1), 220 + i * 260));
    });
    timers.push(setTimeout(() => setDone(true), 2650));
    timers.push(setTimeout(() => onCompleteRef.current(), 3250));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={`boot${done ? " done" : ""}`}>
      <div className="boot-logo">
        <span className="glyph">🍷</span>
        <b>LIQUID ASSETS</b>
      </div>
      <div className="boot-lines">
        {LINES.slice(0, shown).map((line, i) => (
          <div className="boot-line" key={i}>
            <span>{line}…</span>
            <span className="ok">{i === LINES.length - 1 ? "READY" : "OK"}</span>
          </div>
        ))}
      </div>
      <div className="boot-bar">
        <i />
      </div>
    </div>
  );
}
