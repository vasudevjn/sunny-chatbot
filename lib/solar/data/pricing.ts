/**
 * ============================================================================
 * PLACEHOLDER DATA — NOT VERIFIED. DO NOT USE FOR REAL CUSTOMER QUOTES.
 * ============================================================================
 * Installed cost benchmarks in rupees per kW, before subsidy, for residential
 * rooftop systems. Larger systems cost less per kW because the fixed costs of
 * a site visit, structure design and net-metering paperwork are spread wider.
 *
 * Replace these with your own installed-cost data. They drive every price the
 * bot quotes.
 * ============================================================================
 */

import type { ProductTier } from "../types";

export const PRICING_LAST_VERIFIED = "not verified";

export interface PriceBand {
  /** Upper bound of the band in kW. Infinity for the final band. */
  upToKw: number;
  perKwInr: Record<ProductTier, number>;
}

export const PRICE_BANDS: PriceBand[] = [
  {
    upToKw: 2,
    perKwInr: { value: 62_000, standard: 70_000, premium: 80_000 },
  },
  {
    upToKw: 5,
    perKwInr: { value: 58_000, standard: 65_000, premium: 75_000 },
  },
  {
    upToKw: Infinity,
    perKwInr: { value: 52_000, standard: 58_000, premium: 68_000 },
  },
];

export const DEFAULT_TIER: ProductTier = "standard";

export const TIER_DESCRIPTIONS: Record<ProductTier, string> = {
  value:
    "Reliable, budget-focused equipment. Shorter product warranties and a basic mounting structure.",
  standard:
    "The most common choice: tier-1 panels, a well-supported inverter and a galvanised structure. Best balance of cost and life.",
  premium:
    "Highest-efficiency panels for tight roofs, a premium inverter with per-panel monitoring, and a heavier structure with a longer warranty.",
};

/**
 * Cost per kW for a system of this size and tier. Uses the band the whole
 * system falls into — not a marginal calculation — because installers price
 * the job as a whole, not incrementally.
 */
export function pricePerKw(systemKw: number, tier: ProductTier): number {
  const band =
    PRICE_BANDS.find((b) => systemKw <= b.upToKw) ??
    PRICE_BANDS[PRICE_BANDS.length - 1];
  return band.perKwInr[tier];
}

/** Gross installed cost before any subsidy, in rupees. */
export function grossCostFor(systemKw: number, tier: ProductTier): number {
  return Math.round(systemKw * pricePerKw(systemKw, tier));
}
