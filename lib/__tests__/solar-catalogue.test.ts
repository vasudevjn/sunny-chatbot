import { describe, it, expect } from "vitest";
import { matchPackages, formatMatches, CatalogueError } from "@/lib/solar/catalogue";
import { PACKAGES, getPanel, getInverter } from "@/lib/solar/data/catalogue";
import { centralSubsidyFor } from "@/lib/solar/data/subsidy";
import type { MatchInput } from "@/lib/solar/types";

const base: MatchInput = { systemKw: 3, state: "MH" };

describe("catalogue integrity", () => {
  it("every package references a real panel and inverter", () => {
    for (const pkg of PACKAGES) {
      expect(getPanel(pkg.panelId), `panel for ${pkg.id}`).toBeDefined();
      expect(getInverter(pkg.inverterId), `inverter for ${pkg.id}`).toBeDefined();
    }
  });

  it("a package is DCR compliant only if its panel is", () => {
    for (const pkg of PACKAGES) {
      const panel = getPanel(pkg.panelId)!;
      if (pkg.dcrCompliant) {
        expect(panel.dcrCompliant, `${pkg.id} claims DCR but its panel does not`).toBe(true);
      }
    }
  });

  it("the inverter is not undersized for the array", () => {
    for (const pkg of PACKAGES) {
      const inverter = getInverter(pkg.inverterId)!;
      expect(inverter.capacityKw, `${pkg.id}`).toBeGreaterThanOrEqual(pkg.sizeKw);
    }
  });

  it("panel count roughly matches the stated system size", () => {
    for (const pkg of PACKAGES) {
      const panel = getPanel(pkg.panelId)!;
      const arrayKw = (panel.wattage * pkg.panelCount) / 1000;
      // Allow 20% either way for real-world array sizing.
      expect(arrayKw, `${pkg.id}`).toBeGreaterThan(pkg.sizeKw * 0.8);
      expect(arrayKw, `${pkg.id}`).toBeLessThan(pkg.sizeKw * 1.2);
    }
  });
});

describe("DCR rule — the one that costs real money", () => {
  it("never offers a non-DCR package to someone claiming the subsidy", () => {
    const { matches } = matchPackages({ ...base, wantsSubsidy: true });
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.pkg.dcrCompliant).toBe(true);
    }
  });

  it("defaults to claiming the subsidy when not told otherwise", () => {
    const { matches } = matchPackages(base);
    for (const m of matches) {
      expect(m.pkg.dcrCompliant).toBe(true);
    }
  });

  it("reports how many options the DCR rule removed", () => {
    const result = matchPackages({ ...base, wantsSubsidy: true });
    expect(result.excludedForDcr).toBeGreaterThan(0);
    expect(result.notes.join(" ")).toMatch(/imported panels/i);
  });

  it("does offer non-DCR options when the subsidy is declined", () => {
    const { matches } = matchPackages({ ...base, wantsSubsidy: false });
    expect(matches.some((m) => !m.pkg.dcrCompliant)).toBe(true);
  });

  it("gives no subsidy to a non-DCR package even if subsidy is requested", () => {
    const { matches } = matchPackages({ ...base, wantsSubsidy: false });
    for (const m of matches) {
      if (!m.pkg.dcrCompliant) expect(m.subsidyInr).toBe(0);
    }
  });
});

describe("pricing", () => {
  it("nets the correct subsidy off each DCR package", () => {
    const { matches } = matchPackages(base);
    for (const m of matches) {
      expect(m.subsidyInr).toBe(centralSubsidyFor(m.pkg.sizeKw));
      expect(m.netPriceInr).toBe(m.pkg.priceInr - m.subsidyInr);
    }
  });

  it("never returns a negative net price", () => {
    for (const kw of [2, 3, 5, 8]) {
      const { matches } = matchPackages({ ...base, systemKw: kw });
      for (const m of matches) expect(m.netPriceInr).toBeGreaterThan(0);
    }
  });

  it("respects a budget when something fits", () => {
    const budgetInr = 130_000;
    const { matches } = matchPackages({ ...base, budgetInr });
    for (const m of matches) expect(m.netPriceInr).toBeLessThanOrEqual(budgetInr);
  });

  it("returns the cheapest option and says so when nothing fits the budget", () => {
    const result = matchPackages({ ...base, budgetInr: 1000 });
    expect(result.matches).toHaveLength(1);
    expect(result.notes.join(" ")).toMatch(/Nothing fits/i);
  });
});

describe("ranking and filtering", () => {
  it("puts the closest size first", () => {
    const { matches } = matchPackages({ ...base, systemKw: 3 });
    expect(matches[0].pkg.sizeKw).toBe(3);
  });

  it("prefers the requested tier at the same size", () => {
    const { matches } = matchPackages({ ...base, systemKw: 3, tier: "premium" });
    expect(matches[0].pkg.tier).toBe("premium");
  });

  it("is stable: the same input gives the same order", () => {
    const a = matchPackages({ ...base, systemKw: 5 }).matches.map((m) => m.pkg.id);
    const b = matchPackages({ ...base, systemKw: 5 }).matches.map((m) => m.pkg.id);
    expect(a).toEqual(b);
  });

  it("returns at most three options", () => {
    const { matches } = matchPackages({ ...base, systemKw: 3 });
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("honours a three-phase requirement", () => {
    const { matches } = matchPackages({ ...base, systemKw: 8, phase: "three" });
    expect(matches.every((m) => m.pkg.phase === "three")).toBe(true);
  });

  it("honours phase even when it forces a badly sized system, and says so", () => {
    // The catalogue only carries three-phase at 8 kW, so a 2 kW three-phase
    // household gets the 8 kW unit. Phase is a hard constraint, but the
    // mismatch must be stated rather than glossed as "a little larger".
    const result = matchPackages({ ...base, systemKw: 2, phase: "three" });
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every((m) => m.pkg.phase === "three")).toBe(true);
    expect(result.notes.join(" ")).toMatch(/nearest available/i);
    expect(result.matches[0].whyThisFits.join(" ")).toMatch(
      /substantially larger/i
    );
  });

  it("only returns packages sold in the requested state", () => {
    for (const state of ["GJ", "MH"] as const) {
      const { matches } = matchPackages({ ...base, state });
      for (const m of matches) {
        expect(m.pkg.availableStates).toContain(state);
      }
    }
  });

  it("gives every match a reason", () => {
    const { matches } = matchPackages(base);
    for (const m of matches) {
      expect(m.whyThisFits.length).toBeGreaterThan(0);
    }
  });
});

describe("model-facing output", () => {
  it("includes package ids so a later proposal can reference one", () => {
    const result = matchPackages(base);
    const text = formatMatches(result, base);
    for (const m of result.matches) {
      expect(text).toContain(`[id: ${m.pkg.id}]`);
    }
  });

  it("flags non-DCR packages loudly in the text", () => {
    const input = { ...base, wantsSubsidy: false };
    const result = matchPackages(input);
    const text = formatMatches(result, input);
    if (result.matches.some((m) => !m.pkg.dcrCompliant)) {
      expect(text).toMatch(/not eligible for the subsidy/i);
    }
  });

  it("tells the model these are options, not a quotation", () => {
    const text = formatMatches(matchPackages(base), base);
    expect(text).toMatch(/not as a quotation/i);
  });
});

describe("failure modes", () => {
  it("throws a typed error when a state has no packages", () => {
    // @ts-expect-error deliberately invalid state to prove the guard fires
    expect(() => matchPackages({ ...base, state: "KA" })).toThrow(CatalogueError);
  });
});
