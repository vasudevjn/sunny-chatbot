import { describe, it, expect } from "vitest";
import {
  billForUnits,
  unitsForBill,
  getTariff,
} from "@/lib/solar/data/tariffs";
import {
  centralSubsidyFor,
  subsidyFor,
  CENTRAL_SUBSIDY_CAP_INR,
} from "@/lib/solar/data/subsidy";
import { grossCostFor } from "@/lib/solar/data/pricing";
import {
  billToUnits,
  buildCashflow,
  chooseSystemSize,
  paybackFromCashflow,
  sizeSystem,
  SizingInputError,
} from "@/lib/solar/sizing";
import { SYSTEM_ASSUMPTIONS, getStateProfile } from "@/lib/solar/data/states";
import type { SizingInput } from "@/lib/solar/types";

describe("tariff slab maths", () => {
  const mh = getTariff("MH");
  const gj = getTariff("GJ");

  it("charges only the fixed charge at zero consumption", () => {
    expect(billForUnits(0, mh)).toBe(mh.fixedChargePerMonthInr);
  });

  it("is monotonically increasing in units", () => {
    let previous = -1;
    for (let u = 0; u <= 1000; u += 25) {
      const bill = billForUnits(u, mh);
      expect(bill).toBeGreaterThan(previous);
      previous = bill;
    }
  });

  it("charges each slab only for the units inside it", () => {
    // First MSEDCL slab is 100 units at 4.71, then 10.29.
    const at100 = billForUnits(100, mh);
    const at200 = billForUnits(200, mh);
    const secondSlabCost = (at200 - at100) / mh.otherChargesFactor;
    expect(secondSlabCost).toBeCloseTo(100 * 10.29, 5);
  });

  it("inverts back to the original consumption", () => {
    for (const units of [30, 95, 150, 320, 480, 750, 1200]) {
      for (const tariff of [mh, gj]) {
        const bill = billForUnits(units, tariff);
        expect(unitsForBill(bill, tariff)).toBeCloseTo(units, 3);
      }
    }
  });

  it("returns zero units for a bill at or below the fixed charge", () => {
    expect(unitsForBill(mh.fixedChargePerMonthInr, mh)).toBe(0);
    expect(unitsForBill(10, mh)).toBe(0);
  });

  it("billToUnits routes through the right state's tariff", () => {
    const viaHelper = billToUnits(4000, "MH");
    const direct = unitsForBill(4000, mh);
    expect(viaHelper).toBeCloseTo(direct, 6);
    // Gujarat's cheaper slabs mean the same rupees buy more units.
    expect(billToUnits(4000, "GJ")).toBeGreaterThan(viaHelper);
  });
});

describe("PM Surya Ghar subsidy slabs", () => {
  it("pays 30,000 per kW for the first 2 kW", () => {
    expect(centralSubsidyFor(1)).toBe(30_000);
    expect(centralSubsidyFor(2)).toBe(60_000);
  });

  it("pays 18,000 for the third kW and caps at 78,000", () => {
    expect(centralSubsidyFor(3)).toBe(78_000);
    expect(centralSubsidyFor(2.5)).toBe(69_000);
  });

  it("does not exceed the cap for any larger system", () => {
    for (const kw of [3, 4, 5, 8, 10, 25]) {
      expect(centralSubsidyFor(kw)).toBe(CENTRAL_SUBSIDY_CAP_INR);
    }
  });

  it("is zero at or below zero capacity", () => {
    expect(centralSubsidyFor(0)).toBe(0);
    expect(centralSubsidyFor(-1)).toBe(0);
  });

  it("returns nothing when the homeowner is not claiming", () => {
    const claimed = subsidyFor(3, "MH", true);
    const declined = subsidyFor(3, "MH", false);
    expect(claimed.totalInr).toBe(78_000);
    expect(declined.totalInr).toBe(0);
    expect(declined.requiresDcr).toBe(false);
  });
});

describe("system sizing constraints", () => {
  const shadingFactor = 1;

  it("is limited by consumption when the roof is ample", () => {
    const { binding, recommendedKw, idealKw } = chooseSystemSize(4800, "MH", {
      roofAreaSqft: 2000,
      shadingFactor,
    });
    expect(binding).toBe("consumption");
    expect(recommendedKw).toBe(idealKw);
  });

  it("is limited by the roof when the roof is small", () => {
    const profile = getStateProfile("MH");
    const roofAreaSqft = 200;
    const { binding, recommendedKw, idealKw } = chooseSystemSize(9000, "MH", {
      roofAreaSqft,
      shadingFactor,
    });
    expect(binding).toBe("roof-area");
    expect(recommendedKw).toBeLessThan(idealKw);
    // Must never claim more roof than exists.
    expect(recommendedKw * profile.sqftPerKw).toBeLessThanOrEqual(roofAreaSqft);
  });

  it("is limited by the sanctioned load when that is the tightest", () => {
    const { binding, recommendedKw } = chooseSystemSize(9000, "MH", {
      roofAreaSqft: 5000,
      sanctionedLoadKw: 2,
      shadingFactor,
    });
    expect(binding).toBe("sanctioned-load");
    expect(recommendedKw).toBeLessThanOrEqual(2);
  });

  it("falls back to the state cap for very large consumption", () => {
    const profile = getStateProfile("MH");
    const { binding, recommendedKw } = chooseSystemSize(100_000, "MH", {
      roofAreaSqft: 100_000,
      shadingFactor,
    });
    expect(binding).toBe("state-cap");
    expect(recommendedKw).toBe(profile.maxResidentialKw);
  });

  it("rounds to the configured step and never returns zero", () => {
    const { recommendedKw } = chooseSystemSize(500, "GJ", {
      roofAreaSqft: 20,
      shadingFactor,
    });
    expect(recommendedKw).toBeGreaterThan(0);
    const steps = recommendedKw / SYSTEM_ASSUMPTIONS.sizeRoundingStepKw;
    expect(Number.isInteger(Math.round(steps * 1e6) / 1e6)).toBe(true);
  });
});

describe("cashflow and payback", () => {
  it("models the full system life and grows cumulatively", () => {
    const cashflow = buildCashflow(3, 4320, 40_000, 100_000);
    expect(cashflow).toHaveLength(SYSTEM_ASSUMPTIONS.systemLifeYears);
    expect(cashflow[0].cumulativeInr).toBeLessThan(0);
    for (let i = 1; i < cashflow.length; i++) {
      expect(cashflow[i].cumulativeInr).toBeGreaterThan(
        cashflow[i - 1].cumulativeInr
      );
    }
  });

  it("degrades generation year on year", () => {
    const cashflow = buildCashflow(3, 4320, 40_000, 100_000);
    expect(cashflow[24].generationKwh).toBeLessThan(cashflow[0].generationKwh);
  });

  it("deducts running costs, so payback lags naive division", () => {
    const netCost = 100_000;
    const annualSavings = 40_000;
    const cashflow = buildCashflow(3, 4320, annualSavings, netCost);
    const payback = paybackFromCashflow(cashflow, netCost);
    // Naive payback is 2.5 years. O&M is deducted every year and outweighs
    // tariff escalation this early, so the real figure is slightly longer.
    expect(payback).toBeGreaterThan(netCost / annualSavings);
    expect(payback).toBeLessThan(SYSTEM_ASSUMPTIONS.systemLifeYears);
  });

  it("grows savings over time despite panel degradation", () => {
    const cashflow = buildCashflow(3, 4320, 40_000, 100_000);
    // Tariff escalation outpaces the 0.5%/year output loss.
    expect(cashflow[9].savingsInr).toBeGreaterThan(cashflow[0].savingsInr);
  });

  it("charges an inverter replacement in its year", () => {
    const cashflow = buildCashflow(3, 4320, 40_000, 100_000);
    const year = SYSTEM_ASSUMPTIONS.inverterReplacementYear;
    const replacementYear = cashflow[year - 1];
    const yearBefore = cashflow[year - 2];
    expect(replacementYear.savingsInr).toBeLessThan(yearBefore.savingsInr);
  });

  it("returns Infinity when the system never pays back", () => {
    const cashflow = buildCashflow(3, 4320, 100, 10_000_000);
    expect(paybackFromCashflow(cashflow, 10_000_000)).toBe(Infinity);
  });
});

describe("sizeSystem end to end", () => {
  const base: SizingInput = { state: "MH", monthlyBillInr: 4000 };

  it("produces a coherent estimate from a bill alone", () => {
    const r = sizeSystem(base);
    expect(r.monthlyUnits).toBeGreaterThan(0);
    expect(r.recommendedSystemKw).toBeGreaterThan(0);
    expect(r.unitsWereDerived).toBe(true);
    expect(r.netCostInr).toBe(r.grossCostInr - r.subsidyInr);
    expect(r.annualSavingsInr).toBe(r.monthlySavingsInr * 12);
    expect(r.paybackYears).toBeGreaterThan(0);
    expect(Number.isFinite(r.paybackYears)).toBe(true);
  });

  it("never saves more than the bill itself", () => {
    for (const bill of [800, 2000, 4000, 9000, 20_000]) {
      const r = sizeSystem({ state: "MH", monthlyBillInr: bill });
      expect(r.monthlySavingsInr).toBeLessThan(r.monthlyBillInr);
      expect(r.newMonthlyBillInr).toBeGreaterThan(0);
      expect(r.monthlySavingsInr).toBeGreaterThan(0);
    }
  });

  it("values offset units at the marginal slab, not the average rate", () => {
    // A high-consumption MSEDCL household sits in the steep upper slabs, so the
    // units solar removes are worth far more than the average rate paid.
    const r = sizeSystem({ state: "MH", monthlyUnits: 500 });
    const offsetUnits = Math.min(500, r.annualGenerationKwh / 12);
    const averageRate = r.monthlyBillInr / r.monthlyUnits;
    const realisedRate = r.monthlySavingsInr / offsetUnits;
    expect(realisedRate).toBeGreaterThan(averageRate);
  });

  it("reports the roof as the binding constraint when it is", () => {
    const r = sizeSystem({
      state: "MH",
      monthlyBillInr: 8000,
      roofAreaSqft: 200,
    });
    expect(r.bindingConstraint).toBe("roof-area");
    expect(r.recommendedSystemKw).toBeLessThan(r.idealSystemKw);
    expect(r.caveats.join(" ")).toMatch(/roof/i);
    expect(r.offsetFraction).toBeLessThan(1);
  });

  it("prefers given units over a given bill", () => {
    const fromUnits = sizeSystem({
      state: "MH",
      monthlyUnits: 400,
      monthlyBillInr: 99_999,
    });
    expect(fromUnits.monthlyUnits).toBe(400);
    expect(fromUnits.unitsWereDerived).toBe(false);
  });

  it("drops the subsidy when the homeowner is not claiming", () => {
    const withSubsidy = sizeSystem({ ...base, wantsSubsidy: true });
    const without = sizeSystem({ ...base, wantsSubsidy: false });
    expect(without.subsidyInr).toBe(0);
    expect(without.netCostInr).toBe(without.grossCostInr);
    expect(without.paybackYears).toBeGreaterThan(withSubsidy.paybackYears);
  });

  it("prices premium above standard above value", () => {
    const value = sizeSystem({ ...base, tier: "value" });
    const standard = sizeSystem({ ...base, tier: "standard" });
    const premium = sizeSystem({ ...base, tier: "premium" });
    expect(value.grossCostInr).toBeLessThan(standard.grossCostInr);
    expect(standard.grossCostInr).toBeLessThan(premium.grossCostInr);
  });

  it("generates less when shading is present", () => {
    const clear = sizeSystem({ state: "MH", monthlyUnits: 400 });
    const shaded = sizeSystem({
      state: "MH",
      monthlyUnits: 400,
      shadingFactor: 0.8,
    });
    // Same consumption, but a shaded roof needs a bigger system for it.
    expect(shaded.recommendedSystemKw).toBeGreaterThan(
      clear.recommendedSystemKw
    );
  });

  it("always carries the estimate-not-quotation caveat", () => {
    const r = sizeSystem(base);
    expect(r.caveats.join(" ")).toMatch(/estimate, not a quotation/i);
    expect(r.assumptions.length).toBeGreaterThan(0);
  });

  it("costs match the pricing table", () => {
    const r = sizeSystem(base);
    expect(r.grossCostInr).toBe(grossCostFor(r.recommendedSystemKw, "standard"));
  });

  it("rejects inputs with neither units nor a bill", () => {
    expect(() => sizeSystem({ state: "MH" })).toThrow(SizingInputError);
  });

  it("rejects a bill below the fixed charge", () => {
    expect(() => sizeSystem({ state: "MH", monthlyBillInr: 20 })).toThrow(
      SizingInputError
    );
  });

  it("gives Gujarat a bigger system than Maharashtra for the same rupees", () => {
    // Gujarat's cheaper slabs mean the same bill implies more units consumed.
    const gj = sizeSystem({ state: "GJ", monthlyBillInr: 4000 });
    const mh = sizeSystem({ state: "MH", monthlyBillInr: 4000 });
    expect(gj.monthlyUnits).toBeGreaterThan(mh.monthlyUnits);
    expect(gj.recommendedSystemKw).toBeGreaterThanOrEqual(
      mh.recommendedSystemKw
    );
  });
});
