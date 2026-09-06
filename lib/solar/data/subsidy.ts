import type { ServiceStateCode } from "../types";

export const SUBSIDY_LAST_VERIFIED = "not verified";
export const SUBSIDY_SCHEME_NAME = "PM Surya Ghar Muft Bijli Yojana";
export const SUBSIDY_PORTAL_URL = "https://pmsuryaghar.gov.in/";

/**
 * Marginal per-kW central assistance. Each band applies only to the portion of
 * capacity that falls inside it, exactly like a tax slab.
 */
export const CENTRAL_SUBSIDY_BANDS: { upToKw: number; perKwInr: number }[] = [
  { upToKw: 2, perKwInr: 30_000 },
  { upToKw: 3, perKwInr: 18_000 },
];

/** Hard ceiling on central assistance regardless of system size. */
export const CENTRAL_SUBSIDY_CAP_INR = 78_000;

/** Additional state assistance, over and above the central amount. */
export const STATE_TOP_UP: Record<
  ServiceStateCode,
  { perKwInr: number; capInr: number; note: string }
> = {
  GJ: {
    perKwInr: 0,
    capInr: 0,
    note:
      "No state top-up modelled. Gujarat has historically run its own rooftop programme — confirm the current position with the DISCOM.",
  },
  MH: {
    perKwInr: 0,
    capInr: 0,
    note: "No state top-up modelled. Confirm the current position with MSEDCL.",
  },
};

/**
 * Domestic Content Requirement. Modules (and in practice cells) must be
 * domestically manufactured for a system to qualify for the central subsidy.
 * This is why the catalogue matcher hard-filters on dcrCompliant whenever the
 * homeowner intends to claim.
 */
export const DCR_REQUIRED_FOR_SUBSIDY = true;

export const SUBSIDY_ELIGIBILITY_NOTES = [
  "The property must have a valid residential electricity connection.",
  "The system must use domestically manufactured modules to qualify.",
  "Installation must be done through a registered vendor and the application filed on the national portal.",
  "The subsidy is paid to the homeowner's bank account after inspection and net-meter commissioning, not deducted upfront by every vendor.",
];

/** Central assistance for a given system size, in rupees. */
export function centralSubsidyFor(systemKw: number): number {
  if (systemKw <= 0) return 0;

  let remaining = systemKw;
  let previousBound = 0;
  let subsidy = 0;

  for (const band of CENTRAL_SUBSIDY_BANDS) {
    const bandWidth = band.upToKw - previousBound;
    const kwInBand = Math.min(remaining, bandWidth);
    subsidy += kwInBand * band.perKwInr;
    remaining -= kwInBand;
    previousBound = band.upToKw;
    if (remaining <= 0) break;
  }

  return Math.min(subsidy, CENTRAL_SUBSIDY_CAP_INR);
}

/** State top-up for a given system size, in rupees. */
export function stateSubsidyFor(
  systemKw: number,
  state: ServiceStateCode
): number {
  const topUp = STATE_TOP_UP[state];
  if (!topUp || topUp.perKwInr <= 0) return 0;
  return Math.min(systemKw * topUp.perKwInr, topUp.capInr);
}

export interface SubsidyBreakdown {
  centralInr: number;
  stateInr: number;
  totalInr: number;
  requiresDcr: boolean;
}

export function subsidyFor(
  systemKw: number,
  state: ServiceStateCode,
  wantsSubsidy = true
): SubsidyBreakdown {
  if (!wantsSubsidy) {
    return { centralInr: 0, stateInr: 0, totalInr: 0, requiresDcr: false };
  }
  const centralInr = centralSubsidyFor(systemKw);
  const stateInr = stateSubsidyFor(systemKw, state);
  return {
    centralInr,
    stateInr,
    totalInr: centralInr + stateInr,
    requiresDcr: DCR_REQUIRED_FOR_SUBSIDY,
  };
}
