/** Shared number/currency formatting. Used by the tools, the UI cards and the PDF. */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** 145000 -> "Rs 1,45,000" (Indian digit grouping). */
export function formatInr(value: number): string {
  return `Rs ${inrFormatter.format(Math.round(value))}`;
}

/** 145000 -> "1,45,000" without the currency prefix. */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Rounded currency for long-horizon figures. A 25-year projection quoted to
 * the rupee reads as false precision and costs more credibility than it buys,
 * so anything a lakh or over is rendered in lakh.
 */
export function formatInrApprox(value: number): string {
  const v = Math.round(value);
  if (Math.abs(v) >= 100_000) {
    return `Rs ${(v / 100_000).toFixed(1)} lakh`;
  }
  return formatInr(Math.round(v / 100) * 100);
}

/** 3 -> "3 kW", 2.5 -> "2.5 kW" */
export function formatKw(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} kW`;
}

/** 6.42 -> "6 years 5 months" */
export function formatYears(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return "not reached";
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (whole === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${whole} year${whole === 1 ? "" : "s"}`;
  if (months === 12) return `${whole + 1} years`;
  return `${whole} year${whole === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

/** Compact form for narrow card columns: 6.42 -> "6 yr 5 mo" */
export function formatYearsShort(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return "not reached";
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (whole === 0) return `${months} mo`;
  if (months === 0 || months === 12) return `${whole + (months === 12 ? 1 : 0)} yr`;
  return `${whole} yr ${months} mo`;
}

/** 0.87 -> "87%" */
export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
