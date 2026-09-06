/**
 * The solar sizing engine.
 *
 * Pure, deterministic, no I/O and no LLM. Every rupee and kW the assistant
 * states about a system comes from here. The model narrates these numbers; it
 * never produces them.
 *
 * All domain constants live in ./data/* so that correcting a tariff or a price
 * is a data edit, never a code edit.
 */

import type {
  BindingConstraint,
  CashflowYear,
  ProductTier,
  ServiceStateCode,
  SizingInput,
  SizingResult,
} from "./types";
import { getStateProfile, resolveDiscom, SYSTEM_ASSUMPTIONS } from "./data/states";
import { billForUnits, getTariff, unitsForBill } from "./data/tariffs";
import { DEFAULT_TIER, grossCostFor, pricePerKw } from "./data/pricing";
import { subsidyFor, SUBSIDY_SCHEME_NAME } from "./data/subsidy";
import { formatInr, formatInrApprox, formatKw, formatPct, formatYears } from "./format";

export class SizingInputError extends Error {}

const roundToStep = (value: number, step: number) =>
  Math.round(value / step) * step;
const floorToStep = (value: number, step: number) =>
  Math.floor(value / step) * step;

/**
 * Converts a monthly bill into monthly units using the DISCOM's slab table.
 * Exported for testing and for the bill-upload path, which may have an amount
 * but no unit count.
 */
export function billToUnits(
  monthlyBillInr: number,
  state: ServiceStateCode,
  discom?: string
): number {
  const tariff = getTariff(state, discom);
  return unitsForBill(monthlyBillInr, tariff);
}

/**
 * Picks the system size, applying every constraint and reporting which one
 * actually bound. Exported separately from sizeSystem() so the constraint
 * logic can be tested on its own.
 */
export function chooseSystemSize(
  annualUnits: number,
  state: ServiceStateCode,
  opts: { roofAreaSqft?: number; sanctionedLoadKw?: number; shadingFactor: number }
): { idealKw: number; recommendedKw: number; binding: BindingConstraint } {
  const profile = getStateProfile(state);
  const { sizeRoundingStepKw, minSystemKw } = SYSTEM_ASSUMPTIONS;

  const yieldPerKw = profile.specificYieldKwhPerKwpYear * opts.shadingFactor;
  const rawIdeal = annualUnits / yieldPerKw;
  const idealKw = Math.max(
    minSystemKw,
    roundToStep(rawIdeal, sizeRoundingStepKw)
  );

  // Caps are floored, never rounded up: a constraint must not be exceeded.
  const caps: { kind: BindingConstraint; kw: number }[] = [];
  if (opts.roofAreaSqft && opts.roofAreaSqft > 0) {
    caps.push({
      kind: "roof-area",
      kw: floorToStep(opts.roofAreaSqft / profile.sqftPerKw, sizeRoundingStepKw),
    });
  }
  if (opts.sanctionedLoadKw && opts.sanctionedLoadKw > 0) {
    caps.push({
      kind: "sanctioned-load",
      kw: floorToStep(
        opts.sanctionedLoadKw * profile.sanctionedLoadMultiple,
        sizeRoundingStepKw
      ),
    });
  }
  caps.push({
    kind: "state-cap",
    kw: floorToStep(profile.maxResidentialKw, sizeRoundingStepKw),
  });

  let recommendedKw = idealKw;
  let binding: BindingConstraint = "consumption";
  for (const cap of caps) {
    if (cap.kw < recommendedKw) {
      recommendedKw = cap.kw;
      binding = cap.kind;
    }
  }

  // Never return zero or negative: the caller reports a too-small roof as a
  // caveat rather than as a system that cannot exist.
  recommendedKw = Math.max(sizeRoundingStepKw, recommendedKw);

  return { idealKw, recommendedKw, binding };
}

/**
 * 25-year cashflow.
 *
 * Net of running costs, not just gross savings: annual O&M is deducted every
 * year and an inverter replacement is deducted in its year. Omitting those is
 * the usual way a savings calculator flatters itself.
 */
export function buildCashflow(
  systemKw: number,
  firstYearGenerationKwh: number,
  firstYearSavingsInr: number,
  netCostInr: number
): CashflowYear[] {
  const {
    firstYearDegradationPct,
    annualDegradationPct,
    annualTariffEscalationPct,
    annualOandMPerKwInr,
    annualOandMEscalationPct,
    inverterReplacementYear,
    inverterReplacementCostPerKwInr,
    systemLifeYears,
  } = SYSTEM_ASSUMPTIONS;

  const rows: CashflowYear[] = [];
  let cumulative = -netCostInr;

  for (let year = 1; year <= systemLifeYears; year++) {
    // Output relative to nameplate: a larger first-year drop, then a steady slope.
    const degradationFactor =
      year === 1
        ? 1
        : (1 - firstYearDegradationPct / 100) *
          Math.pow(1 - annualDegradationPct / 100, year - 2);

    const escalationFactor = Math.pow(
      1 + annualTariffEscalationPct / 100,
      year - 1
    );

    const generationKwh = firstYearGenerationKwh * degradationFactor;
    const grossSavings =
      firstYearSavingsInr * degradationFactor * escalationFactor;

    const oAndM =
      systemKw *
      annualOandMPerKwInr *
      Math.pow(1 + annualOandMEscalationPct / 100, year - 1);

    const replacement =
      year === inverterReplacementYear
        ? systemKw * inverterReplacementCostPerKwInr
        : 0;

    const savingsInr = grossSavings - oAndM - replacement;
    cumulative += savingsInr;

    rows.push({
      year,
      generationKwh: Math.round(generationKwh),
      savingsInr: Math.round(savingsInr),
      cumulativeInr: Math.round(cumulative),
    });
  }

  return rows;
}

/**
 * Payback in years, read off the cashflow rather than as netCost/annualSavings.
 * Tariff escalation makes later years worth more, so simple division overstates
 * payback by roughly half a year on a typical system.
 */
export function paybackFromCashflow(
  cashflow: CashflowYear[],
  netCostInr: number
): number {
  if (netCostInr <= 0) return 0;

  let cumulative = 0;
  for (const row of cashflow) {
    const previous = cumulative;
    cumulative += row.savingsInr;
    if (cumulative >= netCostInr) {
      const shortfall = netCostInr - previous;
      const fraction = row.savingsInr > 0 ? shortfall / row.savingsInr : 0;
      return row.year - 1 + fraction;
    }
  }
  return Infinity;
}

/** The whole estimate. Throws SizingInputError when the inputs cannot support one. */
export function sizeSystem(input: SizingInput): SizingResult {
  const state = input.state;
  const profile = getStateProfile(state);
  const discom = resolveDiscom(state, input.discom);
  const tariff = getTariff(state, discom);
  const tier: ProductTier = input.tier ?? DEFAULT_TIER;
  const wantsSubsidy = input.wantsSubsidy ?? true;
  const shadingFactor =
    input.shadingFactor ?? SYSTEM_ASSUMPTIONS.defaultShadingFactor;

  const assumptions: string[] = [];
  const caveats: string[] = [];

  // --- Consumption ---------------------------------------------------------
  let monthlyUnits: number;
  let unitsWereDerived = false;

  if (input.monthlyUnits && input.monthlyUnits > 0) {
    monthlyUnits = input.monthlyUnits;
  } else if (input.monthlyBillInr && input.monthlyBillInr > 0) {
    monthlyUnits = billToUnits(input.monthlyBillInr, state, discom);
    unitsWereDerived = true;
    if (monthlyUnits <= 0) {
      throw new SizingInputError(
        "That bill amount is below the fixed monthly charge, so it does not imply any consumption. Ask for the units consumed instead."
      );
    }
    assumptions.push(
      `Worked back from a monthly bill of ${formatInr(input.monthlyBillInr)} to about ${Math.round(monthlyUnits)} units a month using ${discom}'s residential slabs.`
    );
  } else {
    throw new SizingInputError(
      "Either a monthly bill amount or a monthly unit consumption is needed to size a system."
    );
  }

  const annualUnits = monthlyUnits * 12;
  const monthlyBillInr = billForUnits(monthlyUnits, tariff);

  // --- Size ----------------------------------------------------------------
  const { idealKw, recommendedKw, binding } = chooseSystemSize(
    annualUnits,
    state,
    {
      roofAreaSqft: input.roofAreaSqft,
      sanctionedLoadKw: input.sanctionedLoadKw,
      shadingFactor,
    }
  );

  const annualGenerationKwh =
    recommendedKw * profile.specificYieldKwhPerKwpYear * shadingFactor;
  const monthlyGenerationKwh = annualGenerationKwh / 12;
  const offsetFraction = Math.min(1, annualGenerationKwh / annualUnits);

  // --- Savings -------------------------------------------------------------
  // Solar removes units from the TOP slab downward, so savings are the
  // difference between two full bill calculations, never units x average rate.
  // Generation beyond consumption is not counted: banked export credits vary by
  // DISCOM and settlement rules, and counting them would overstate savings.
  const offsetUnitsPerMonth = Math.min(monthlyUnits, monthlyGenerationKwh);
  const newMonthlyUnits = monthlyUnits - offsetUnitsPerMonth;
  const newMonthlyBillInr = billForUnits(newMonthlyUnits, tariff);
  const monthlySavingsInr = monthlyBillInr - newMonthlyBillInr;
  const annualSavingsInr = monthlySavingsInr * 12;

  // --- Money ---------------------------------------------------------------
  const grossCostInr = grossCostFor(recommendedKw, tier);
  const subsidy = subsidyFor(recommendedKw, state, wantsSubsidy);
  const netCostInr = Math.max(0, grossCostInr - subsidy.totalInr);

  const cashflow = buildCashflow(
    recommendedKw,
    annualGenerationKwh,
    annualSavingsInr,
    netCostInr
  );
  const paybackYears = paybackFromCashflow(cashflow, netCostInr);
  const lifetimeSavingsInr = cashflow.reduce((sum, r) => sum + r.savingsInr, 0);

  const annualOandMInr = Math.round(
    recommendedKw * SYSTEM_ASSUMPTIONS.annualOandMPerKwInr
  );

  const co2AvoidedTonnesPerYear =
    (annualGenerationKwh / 1000) *
    SYSTEM_ASSUMPTIONS.gridEmissionFactorTonnesPerMwh;

  // --- Narrative -----------------------------------------------------------
  assumptions.push(
    `Assumes about ${Math.round(profile.specificYieldKwhPerKwpYear * shadingFactor)} units generated per kW per year in ${profile.name}, which is roughly ${(annualGenerationKwh / recommendedKw / 365).toFixed(1)} units per kW per day.`
  );
  assumptions.push(
    `Priced at the ${tier} tier, about ${formatInr(pricePerKw(recommendedKw, tier))} per kW installed before subsidy.`
  );
  assumptions.push(
    `Lifetime figures deduct about ${formatInr(annualOandMInr)} a year for cleaning and maintenance, and one inverter replacement in year ${SYSTEM_ASSUMPTIONS.inverterReplacementYear}.`
  );
  if (!input.roofAreaSqft) {
    assumptions.push(
      `Roof area was not given. A ${formatKw(recommendedKw)} system needs roughly ${Math.round(recommendedKw * profile.sqftPerKw)} sq ft of shade-free roof.`
    );
  }
  if (shadingFactor < 1) {
    assumptions.push(
      `Reduced generation by ${formatPct(1 - shadingFactor)} to allow for shading.`
    );
  }

  if (binding === "roof-area") {
    caveats.push(
      `The roof, not the electricity bill, is the limit here. Consumption alone would justify ${formatKw(idealKw)}, but the available area supports ${formatKw(recommendedKw)}.`
    );
  } else if (binding === "sanctioned-load") {
    caveats.push(
      `The sanctioned load caps the system at ${formatKw(recommendedKw)} under net metering. Consumption alone would justify ${formatKw(idealKw)}. The sanctioned load can usually be raised by applying to the DISCOM.`
    );
  } else if (binding === "state-cap") {
    caveats.push(
      `Capped at ${formatKw(recommendedKw)}, the largest residential system considered here.`
    );
  }

  if (recommendedKw < SYSTEM_ASSUMPTIONS.minSystemKw) {
    caveats.push(
      `This is below a ${formatKw(SYSTEM_ASSUMPTIONS.minSystemKw)} system, which is the smallest that is usually worth installing. A site visit would confirm whether the roof can take more.`
    );
  }

  if (offsetFraction >= 0.99) {
    caveats.push(
      "This system covers essentially all of the current consumption, so savings cannot grow further unless usage rises."
    );
  }

  if (wantsSubsidy && subsidy.requiresDcr) {
    caveats.push(
      `The ${SUBSIDY_SCHEME_NAME} subsidy of ${formatInr(subsidy.totalInr)} requires domestically manufactured panels and approval from the national portal and the DISCOM. It is credited after commissioning, not deducted upfront.`
    );
  }

  if (unitsWereDerived) {
    caveats.push(
      "Units were worked back from the bill amount. Actual units from the bill would make this estimate sharper."
    );
  }

  caveats.push(
    "This is an estimate, not a quotation. Final design and pricing need a site survey."
  );

  return {
    state,
    stateName: profile.name,
    discom,

    monthlyUnits: Math.round(monthlyUnits),
    annualUnits: Math.round(annualUnits),
    monthlyBillInr: Math.round(monthlyBillInr),
    unitsWereDerived,

    idealSystemKw: idealKw,
    recommendedSystemKw: recommendedKw,
    bindingConstraint: binding,
    roofAreaNeededSqft: Math.round(recommendedKw * profile.sqftPerKw),

    annualGenerationKwh: Math.round(annualGenerationKwh),
    offsetFraction,

    grossCostInr,
    subsidyInr: subsidy.totalInr,
    centralSubsidyInr: subsidy.centralInr,
    stateSubsidyInr: subsidy.stateInr,
    netCostInr,
    tier,

    annualSavingsInr: Math.round(annualSavingsInr),
    annualOandMInr,
    monthlySavingsInr: Math.round(monthlySavingsInr),
    newMonthlyBillInr: Math.round(newMonthlyBillInr),
    paybackYears,
    lifetimeSavingsInr: Math.round(lifetimeSavingsInr),
    cashflow,

    co2AvoidedTonnesPerYear: Math.round(co2AvoidedTonnesPerYear * 100) / 100,

    assumptions,
    caveats,
  };
}

/**
 * Renders a sizing result as the text the model reads back. Deliberately
 * verbose about assumptions and caveats: the model is instructed to pass them
 * on, and it can only do that if they are in front of it.
 */
export function formatSizingResult(result: SizingResult): string {
  const lines: string[] = [];

  lines.push(`SYSTEM ESTIMATE (${result.stateName}, ${result.discom})`);
  lines.push("");
  lines.push(`Current usage: about ${result.monthlyUnits} units a month, roughly ${formatInr(result.monthlyBillInr)}`);
  lines.push(`Recommended system: ${formatKw(result.recommendedSystemKw)}`);
  lines.push(`Roof area needed: about ${result.roofAreaNeededSqft} sq ft`);
  lines.push(`Expected generation: about ${result.annualGenerationKwh} units a year`);
  lines.push(`Covers about ${formatPct(result.offsetFraction)} of current consumption`);
  lines.push("");
  lines.push(`Cost before subsidy: ${formatInr(result.grossCostInr)}`);
  if (result.subsidyInr > 0) {
    lines.push(`Subsidy: ${formatInr(result.subsidyInr)} (central ${formatInr(result.centralSubsidyInr)}${result.stateSubsidyInr > 0 ? `, state ${formatInr(result.stateSubsidyInr)}` : ""})`);
  } else {
    lines.push("Subsidy: none applied");
  }
  lines.push(`Net cost to the homeowner: ${formatInr(result.netCostInr)}`);
  lines.push("");
  lines.push(`Monthly saving: about ${formatInr(result.monthlySavingsInr)}`);
  lines.push(`New monthly bill: about ${formatInr(result.newMonthlyBillInr)}`);
  lines.push(`Annual saving: about ${formatInr(result.annualSavingsInr)} before running costs`);
  lines.push(`Annual upkeep deducted: about ${formatInr(result.annualOandMInr)}`);
  lines.push(`Payback: about ${formatYears(result.paybackYears)}`);
  lines.push(`Savings over 25 years: about ${formatInrApprox(result.lifetimeSavingsInr)} (a projection — quote it rounded, never to the rupee)`);
  lines.push(`CO2 avoided: about ${result.co2AvoidedTonnesPerYear} tonnes a year`);
  lines.push("");
  lines.push("ASSUMPTIONS (tell the homeowner the ones that matter):");
  result.assumptions.forEach((a) => lines.push(`- ${a}`));
  lines.push("");
  lines.push("CAVEATS (you must pass these on):");
  result.caveats.forEach((c) => lines.push(`- ${c}`));

  return lines.join("\n");
}
