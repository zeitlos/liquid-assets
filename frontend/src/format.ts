// Number formatting helpers — the whole product speaks CHF.

export function chf(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function chfCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000)
    return `CHF ${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000)
    return `CHF ${(value / 1_000).toFixed(0)}k`;
  return chf(value);
}

export function pct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function signedPct(value: number, decimals = 2): string {
  const s = (value * 100).toFixed(decimals);
  return `${value >= 0 ? "+" : ""}${s}%`;
}

export function num(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-CH", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}
