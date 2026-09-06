import type { ServiceStateCode } from "../types";

export const LAST_VERIFIED = "not verified";
export const DATA_SOURCE_NOTE =
  "Industry rule-of-thumb placeholders pending verification against DISCOM tariff orders and MNRE benchmarks.";

export interface StateProfile {
  code: ServiceStateCode;
  name: string;
  /** DISCOMs operating in the state. The first entry is the default. */
  discoms: string[];
  /**
   * Final AC yield for a well-installed, unshaded rooftop system, in kWh per
   * kWp per year. This is an all-in figure: it already accounts for inverter,
   * temperature, wiring and typical soiling losses. Do NOT apply a system
   * derate on top of it — shading is handled separately via shadingFactor.
   */
  specificYieldKwhPerKwpYear: number;
  /** Usable roof area required per kW of installed capacity, in square feet. */
  sqftPerKw: number;
  /**
   * Net metering typically limits the system to this multiple of the
   * sanctioned load. Applied only when the sanctioned load is known.
   */
  sanctionedLoadMultiple: number;
  /** Largest residential rooftop system considered here, in kW. */
  maxResidentialKw: number;
  notes: string;
}

export const STATE_PROFILES: Record<ServiceStateCode, StateProfile> = {
  GJ: {
    code: "GJ",
    name: "Gujarat",
    discoms: ["MGVCL", "UGVCL", "DGVCL", "PGVCL", "Torrent Power"],
    specificYieldKwhPerKwpYear: 1500,
    sqftPerKw: 90,
    sanctionedLoadMultiple: 1,
    maxResidentialKw: 10,
    notes:
      "High irradiance and a mature rooftop programme. Gujarat has historically run a state top-up alongside the central subsidy — confirm the current position before relying on it.",
  },
  MH: {
    code: "MH",
    name: "Maharashtra",
    discoms: ["MSEDCL", "Adani Electricity", "Tata Power", "BEST"],
    specificYieldKwhPerKwpYear: 1440,
    sqftPerKw: 90,
    sanctionedLoadMultiple: 1,
    maxResidentialKw: 10,
    notes:
      "Steep upper residential tariff slabs mean payback is often driven by how much of the top slab the system removes, not by average tariff.",
  },
};

/**
 * System-level physical and financial assumptions. Shared across both states.
 */
export const SYSTEM_ASSUMPTIONS = {
  /** Panel output loss in the first year. */
  firstYearDegradationPct: 2.0,
  /** Annual output loss from year 2 onward. */
  annualDegradationPct: 0.5,
  /** Assumed annual electricity tariff escalation used for lifetime savings. */
  annualTariffEscalationPct: 3.0,
  /** Years of cashflow modelled. Matches typical performance warranty. */
  systemLifeYears: 25,
  /**
   * Annual operations and maintenance per kW: panel cleaning, an inspection
   * visit, minor parts. Real proposals include this; leaving it out is the most
   * common way a savings calculator flatters itself.
   */
  annualOandMPerKwInr: 600,
  /** Assumed annual inflation on that O&M cost. */
  annualOandMEscalationPct: 5.0,
  /** Inverters rarely last the full panel life. Year in which one is replaced. */
  inverterReplacementYear: 12,
  /** Cost of that replacement, per kW, at today's prices. */
  inverterReplacementCostPerKwInr: 8_000,
  /** Default shading multiplier when shading has not been discussed. */
  defaultShadingFactor: 1.0,
  /**
   * Grid emission factor, tonnes of CO2 per MWh displaced.
   * CEA publishes this annually for the Indian grid.
   */
  gridEmissionFactorTonnesPerMwh: 0.71,
  /** System size is rounded to this step, in kW. */
  sizeRoundingStepKw: 0.5,
  /** Smallest system worth installing, in kW. */
  minSystemKw: 1,
} as const;

export function getStateProfile(state: ServiceStateCode): StateProfile {
  return STATE_PROFILES[state];
}

export function resolveDiscom(
  state: ServiceStateCode,
  requested?: string
): string {
  const profile = STATE_PROFILES[state];
  if (!requested) return profile.discoms[0];
  const needle = requested.trim().toLowerCase();
  const hit = profile.discoms.find(
    (d) => d.toLowerCase() === needle || d.toLowerCase().includes(needle)
  );
  return hit ?? profile.discoms[0];
}
