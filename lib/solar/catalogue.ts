/**
 * Deterministic catalogue matcher.
 *
 * Ranks the installer's packages against a system size and whatever the
 * homeowner has told us. Like the sizing engine, it contains no model: the same
 * inputs always produce the same three recommendations, and the reasons given
 * are derived from the data rather than written by the assistant.
 */

import type {
  MatchInput,
  MatchedPackage,
  SolarPackage,
  ServiceStateCode,
} from "./types";
import {
  getInverter,
  getPackage,
  getPanel,
  packagesForState,
} from "./data/catalogue";
import { subsidyFor } from "./data/subsidy";
import { formatInr } from "./format";
import { getStateProfile } from "./data/states";

export class CatalogueError extends Error {}

/** How many recommendations to return. */
const MAX_MATCHES = 3;

function sizeScore(pkg: SolarPackage, targetKw: number): number {
  const ratio = pkg.sizeKw / targetKw;
  // A system materially smaller than needed is worse than one slightly larger:
  // undersizing leaves the homeowner still paying the expensive top slab.
  const penalty = ratio < 1 ? (1 - ratio) * 1.6 : (ratio - 1) * 1.0;
  return Math.max(0, 1 - penalty);
}

function buildReasons(
  pkg: SolarPackage,
  targetKw: number,
  input: MatchInput,
  netPriceInr: number,
  wantsSubsidy: boolean
): string[] {
  const reasons: string[] = [];
  const profile = getStateProfile(input.state as ServiceStateCode);
  const panel = getPanel(pkg.panelId);

  const ratio = pkg.sizeKw / targetKw;
  if (Math.abs(pkg.sizeKw - targetKw) < 0.01) {
    reasons.push(`Matches the ${targetKw} kW you need exactly.`);
  } else if (ratio > 1.5) {
    // Describing a 4x oversize as "a little larger" would be misleading.
    reasons.push(
      `Substantially larger than the ${targetKw} kW you need. It would generate well beyond your usage, so the extra capacity may not pay for itself.`
    );
  } else if (ratio > 1) {
    reasons.push(
      `A little larger than the ${targetKw} kW you need, which leaves headroom if your usage grows.`
    );
  } else if (ratio < 0.7) {
    reasons.push(
      `Well under the ${targetKw} kW you need, so a large part of your bill would remain.`
    );
  } else {
    reasons.push(
      `Smaller than the ${targetKw} kW you need, so it covers less of your bill but costs less upfront.`
    );
  }

  if (wantsSubsidy && pkg.dcrCompliant) {
    reasons.push("Uses domestic panels, so it qualifies for the subsidy.");
  }
  if (!wantsSubsidy && !pkg.dcrCompliant) {
    reasons.push(
      "Imported panels bring the sticker price down, but forfeit the subsidy."
    );
  }

  if (panel && panel.efficiencyPct >= 21) {
    reasons.push(
      `${panel.technology} panels at ${panel.efficiencyPct}% efficiency need about ${Math.round(pkg.sizeKw * profile.sqftPerKw * 0.82)} sq ft rather than the usual ${Math.round(pkg.sizeKw * profile.sqftPerKw)} sq ft.`
    );
  }

  if (input.budgetInr && netPriceInr <= input.budgetInr) {
    reasons.push(`Comes in at ${formatInr(netPriceInr)}, within your budget.`);
  }

  if (pkg.installationWarrantyYears >= 5) {
    reasons.push(
      `${pkg.installationWarrantyYears}-year workmanship warranty and ${pkg.freeServiceVisits} free service visits.`
    );
  }

  return reasons;
}

export function matchPackages(input: MatchInput): {
  matches: MatchedPackage[];
  excludedForDcr: number;
  notes: string[];
} {
  const state = input.state as ServiceStateCode;
  const wantsSubsidy = input.wantsSubsidy ?? true;
  const notes: string[] = [];

  let candidates = packagesForState(state);
  if (candidates.length === 0) {
    throw new CatalogueError(`No packages are available in ${state}.`);
  }

  // The load-bearing rule: claiming the subsidy requires domestic modules.
  // Showing a cheaper non-DCR system to someone who intends to claim would
  // silently cost them up to Rs 78,000.
  let excludedForDcr = 0;
  if (wantsSubsidy) {
    const before = candidates.length;
    candidates = candidates.filter((p) => p.dcrCompliant);
    excludedForDcr = before - candidates.length;
    if (excludedForDcr > 0) {
      notes.push(
        `${excludedForDcr} cheaper option${excludedForDcr === 1 ? "" : "s"} excluded: they use imported panels and would not qualify for the subsidy.`
      );
    }
  }

  if (input.phase) {
    const before = candidates.length;
    candidates = candidates.filter((p) => p.phase === input.phase);
    if (candidates.length === 0) {
      candidates = packagesForState(state).filter(
        (p) => !wantsSubsidy || p.dcrCompliant
      );
      notes.push(
        `No ${input.phase}-phase system matched, so options for other connection types are shown. The connection may need changing.`
      );
    } else if (before !== candidates.length) {
      notes.push(`Limited to ${input.phase}-phase systems.`);
    }
  }

  if (input.roofType) {
    const filtered = candidates.filter((p) =>
      p.roofTypes.includes(input.roofType!)
    );
    if (filtered.length > 0) candidates = filtered;
    else notes.push(`No package is listed for a ${input.roofType} roof; a site visit would confirm the mounting.`);
  }

  // Price each candidate net of the subsidy it would actually attract.
  const priced = candidates.map((pkg) => {
    const subsidy = pkg.dcrCompliant
      ? subsidyFor(pkg.sizeKw, state, wantsSubsidy).totalInr
      : 0;
    return { pkg, subsidyInr: subsidy, netPriceInr: pkg.priceInr - subsidy };
  });

  let affordable = priced;
  if (input.budgetInr) {
    affordable = priced.filter((p) => p.netPriceInr <= input.budgetInr!);
    if (affordable.length === 0) {
      // Never return nothing because of a budget: show the cheapest and be
      // honest that it is over.
      const cheapest = [...priced].sort((a, b) => a.netPriceInr - b.netPriceInr)[0];
      affordable = [cheapest];
      notes.push(
        `Nothing fits a ${formatInr(input.budgetInr)} budget for this system size. The closest is ${formatInr(cheapest.netPriceInr)} after subsidy.`
      );
    }
  }

  const tierBonus = (pkg: SolarPackage) =>
    input.tier ? (pkg.tier === input.tier ? 0.25 : 0) : 0;

  const scored = affordable
    .map((entry) => {
      const score = sizeScore(entry.pkg, input.systemKw) + tierBonus(entry.pkg);
      return { ...entry, score };
    })
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
      // Stable tie-break so the same inputs always give the same order.
      return a.netPriceInr - b.netPriceInr;
    })
    .slice(0, MAX_MATCHES);

  const matches: MatchedPackage[] = scored.flatMap((entry) => {
    const panel = getPanel(entry.pkg.panelId);
    const inverter = getInverter(entry.pkg.inverterId);
    if (!panel || !inverter) {
      // A catalogue entry referencing a missing component is a data error, not
      // something to show a customer.
      console.error(
        `Catalogue entry ${entry.pkg.id} references a missing panel or inverter.`
      );
      return [];
    }
    return [
      {
        pkg: entry.pkg,
        panel,
        inverter,
        subsidyInr: entry.subsidyInr,
        netPriceInr: entry.netPriceInr,
        score: entry.score,
        whyThisFits: buildReasons(
          entry.pkg,
          input.systemKw,
          input,
          entry.netPriceInr,
          wantsSubsidy
        ),
      },
    ];
  });

  if (matches.length === 0) {
    throw new CatalogueError(
      "No package in the catalogue could be matched to those requirements."
    );
  }

  // A constraint (usually phase) can force every remaining option far from the
  // size the homeowner actually needs. Say so rather than quietly presenting a
  // badly sized system as a recommendation.
  const closest = Math.min(
    ...matches.map((m) => Math.abs(m.pkg.sizeKw - input.systemKw))
  );
  if (closest > input.systemKw * 0.5) {
    notes.push(
      `No system close to ${input.systemKw} kW matched these requirements. The options shown are the nearest available and may be over or under sized; a site visit should confirm.`
    );
  }

  return { matches, excludedForDcr, notes };
}

/** Renders matches as the text the model reads back. */
export function formatMatches(
  result: ReturnType<typeof matchPackages>,
  input: MatchInput
): string {
  const lines: string[] = [];
  lines.push(
    `MATCHED SYSTEMS for ${input.systemKw} kW (${input.wantsSubsidy === false ? "not claiming the subsidy" : "claiming the PM Surya Ghar subsidy"})`
  );
  lines.push("");

  result.matches.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.pkg.name} [id: ${m.pkg.id}]`);
    lines.push(`   Size: ${m.pkg.sizeKw} kW, ${m.pkg.tier} tier, ${m.pkg.phase}-phase`);
    lines.push(
      `   Panels: ${m.pkg.panelCount} x ${m.panel.brand} ${m.panel.model} (${m.panel.wattage} W, ${m.panel.technology}, ${m.panel.efficiencyPct}% efficient)`
    );
    lines.push(
      `   Inverter: ${m.inverter.brand} ${m.inverter.model}, ${m.inverter.warrantyYears}-year warranty${m.inverter.hasMonitoring ? ", app monitoring" : ""}`
    );
    lines.push(`   Structure: ${m.pkg.structure}`);
    lines.push(
      `   Panel warranty: ${m.panel.productWarrantyYears} years product, ${m.panel.performanceWarrantyYears} years performance`
    );
    lines.push(
      `   Price: ${formatInr(m.pkg.priceInr)}${m.subsidyInr > 0 ? ` less ${formatInr(m.subsidyInr)} subsidy = ${formatInr(m.netPriceInr)} net` : " (no subsidy)"}`
    );
    lines.push(`   DCR compliant: ${m.pkg.dcrCompliant ? "yes" : "NO — not eligible for the subsidy"}`);
    lines.push(`   Why it fits: ${m.whyThisFits.join(" ")}`);
    lines.push("");
  });

  if (result.notes.length > 0) {
    lines.push("NOTES (mention the relevant ones):");
    result.notes.forEach((n) => lines.push(`- ${n}`));
    lines.push("");
  }

  lines.push(
    "Prices are indicative and exclude any structure or wiring changes a site survey may find. Present these as options, not as a quotation."
  );

  return lines.join("\n");
}

/** Re-export so callers do not need to reach into the data module. */
export { getPackage };
