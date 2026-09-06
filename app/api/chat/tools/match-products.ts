import { tool } from "ai";
import { matchInputSchema } from "@/lib/solar/types";
import { CatalogueError, formatMatches, matchPackages } from "@/lib/solar/catalogue";
import type { CollectArtifact } from "@/lib/solar/artifacts";
import { INSTALLER_NAME } from "@/config";

/**
 * Matches the installer's catalogue to a sized system.
 *
 * Deterministic, like the sizing engine. The one rule that matters most:
 * when the homeowner intends to claim the PM Surya Ghar subsidy, only
 * DCR-compliant packages are eligible, and the matcher enforces that rather
 * than trusting the model to remember it.
 */
export function createMatchSolarProducts(collectArtifact: CollectArtifact) {
  return tool({
    description:
      `Find which ${INSTALLER_NAME} systems fit a homeowner, given a system size from estimateSolarSystem. ` +
      `Call this when they ask what to buy, what it costs, which panels you install, or to compare options. ` +
      `ALWAYS pass wantsSubsidy: claiming the PM Surya Ghar subsidy requires domestically made panels, so it changes which products are eligible. ` +
      `Returns up to three ranked packages with their specs, warranties, net price after subsidy, and the reason each one fits.`,
    inputSchema: matchInputSchema,

    execute: async (input) => {
      try {
        const result = matchPackages(input);
        collectArtifact({ kind: "packages", matches: result.matches });
        return formatMatches(result, input);
      } catch (error) {
        if (error instanceof CatalogueError) {
          return `NO MATCHES. ${error.message} Tell the homeowner you will have an advisor confirm what fits, and do not invent products or prices.`;
        }
        console.error("matchSolarProducts failed:", error);
        return "NO MATCHES. The product catalogue is unavailable right now. Do NOT describe or price any product from memory; offer a callback instead.";
      }
    },
  });
}
