import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
}

/** Counts smoothly from the previous value to the new one (ease-out cubic). */
export default function AnimatedNumber({ value, format, duration = 900 }: Props) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = displayRef.current;
    const delta = value - from;
    if (Math.abs(delta) < 1e-9) {
      setDisplay(value);
      displayRef.current = value;
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + delta * eased;
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}
