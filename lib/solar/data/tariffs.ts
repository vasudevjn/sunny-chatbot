import type { ServiceStateCode } from "../types";

export const TARIFFS_LAST_VERIFIED = "not verified";

export interface TariffSlab {
  /** Upper bound of this slab in units. Use Infinity for the final slab. */
  upToUnits: number;
  ratePerUnit: number;
}

export interface TariffSchedule {
  discom: string;
  state: ServiceStateCode;
  slabs: TariffSlab[];
  fixedChargePerMonthInr: number;
  /**
   * Multiplier on the energy charge covering duty, fuel adjustment, wheeling
   * and tax. 1.15 means the total lands about 15% above the raw energy charge.
   */
  otherChargesFactor: number;
  notes: string;
}

/**
 * Keyed by DISCOM name exactly as it appears in STATE_PROFILES.discoms.
 */
export const TARIFF_SCHEDULES: Record<string, TariffSchedule> = {
  // --- Gujarat -------------------------------------------------------------
  MGVCL: {
    discom: "MGVCL",
    state: "GJ",
    slabs: [
      { upToUnits: 50, ratePerUnit: 3.2 },
      { upToUnits: 100, ratePerUnit: 3.7 },
      { upToUnits: 250, ratePerUnit: 4.6 },
      { upToUnits: Infinity, ratePerUnit: 5.2 },
    ],
    fixedChargePerMonthInr: 45,
    otherChargesFactor: 1.15,
    notes: "Gujarat RGP-style residential slabs, approximated.",
  },

  // --- Maharashtra ---------------------------------------------------------
  MSEDCL: {
    discom: "MSEDCL",
    state: "MH",
    slabs: [
      { upToUnits: 100, ratePerUnit: 4.71 },
      { upToUnits: 300, ratePerUnit: 10.29 },
      { upToUnits: 500, ratePerUnit: 14.55 },
      { upToUnits: Infinity, ratePerUnit: 16.64 },
    ],
    fixedChargePerMonthInr: 128,
    otherChargesFactor: 1.12,
    notes:
      "Steep upper slabs. A household above 300 units a month sees most of its solar savings come from removing the 300-500 and 500+ slabs.",
  },
};

/** Fallbacks used when a specific DISCOM has no schedule of its own. */
const STATE_DEFAULT_DISCOM: Record<ServiceStateCode, string> = {
  GJ: "MGVCL",
  MH: "MSEDCL",
};

export function getTariff(
  state: ServiceStateCode,
  discom?: string
): TariffSchedule {
  if (discom && TARIFF_SCHEDULES[discom]) return TARIFF_SCHEDULES[discom];
  return TARIFF_SCHEDULES[STATE_DEFAULT_DISCOM[state]];
}

/**
 * Total monthly bill for a given consumption, in rupees.
 * Walks the slabs cumulatively — units are charged at each slab's rate only
 * for the portion falling inside that slab.
 */
export function billForUnits(units: number, tariff: TariffSchedule): number {
  if (units <= 0) return tariff.fixedChargePerMonthInr;

  let remaining = units;
  let previousBound = 0;
  let energyCharge = 0;

  for (const slab of tariff.slabs) {
    const slabWidth = slab.upToUnits - previousBound;
    const unitsInSlab = Math.min(remaining, slabWidth);
    energyCharge += unitsInSlab * slab.ratePerUnit;
    remaining -= unitsInSlab;
    previousBound = slab.upToUnits;
    if (remaining <= 0) break;
  }

  return energyCharge * tariff.otherChargesFactor + tariff.fixedChargePerMonthInr;
}

/**
 * Inverse of billForUnits: the consumption that would produce this bill.
 *
 * billForUnits is monotonically increasing in units, so a bisection converges
 * reliably and stays correct if the slab table is later replaced with one that
 * has different bounds or more slabs.
 */
export function unitsForBill(billInr: number, tariff: TariffSchedule): number {
  if (billInr <= tariff.fixedChargePerMonthInr) return 0;

  let low = 0;
  let high = 64;
  // Expand the bracket until it contains the answer.
  while (billForUnits(high, tariff) < billInr && high < 100_000) high *= 2;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (billForUnits(mid, tariff) < billInr) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * The average rate actually paid per unit at this consumption level, including
 * fixed charges. Useful for explaining a bill, not for computing savings —
 * solar removes units from the TOP slab down, so savings must always be
 * computed as the difference between two billForUnits() calls.
 */
export function averageRatePerUnit(
  units: number,
  tariff: TariffSchedule
): number {
  if (units <= 0) return 0;
  return billForUnits(units, tariff) / units;
}
