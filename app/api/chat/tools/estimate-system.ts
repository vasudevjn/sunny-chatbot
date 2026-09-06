import { tool } from "ai";
import { sizingInputSchema } from "@/lib/solar/types";
import { formatSizingResult, sizeSystem, SizingInputError } from "@/lib/solar/sizing";
import type { CollectArtifact } from "@/lib/solar/artifacts";
import { SERVICE_AREA_TEXT } from "@/config";

/**
 * The deterministic savings calculator.
 *
 * Every figure the assistant states about size, cost, subsidy, savings or
 * payback comes from here. There is no model in the loop: the same inputs
 * always produce the same numbers, and the proposal route recomputes from the
 * same function so a document can never disagree with the chat.
 */
export function createEstimateSolarSystem(collectArtifact: CollectArtifact) {
  return tool({
    description:
      `Calculate the recommended rooftop solar system size, cost, PM Surya Ghar subsidy, ` +
      `monthly savings and payback period for a homeowner in ${SERVICE_AREA_TEXT}. ` +
      `Call this as soon as you know their monthly electricity bill (or monthly units) and their state. ` +
      `You MUST use this tool for every number you quote — never calculate savings, costs or payback yourself. ` +
      `Call it again whenever the homeowner corrects an input. ` +
      `Returns the figures plus the assumptions and caveats you are required to pass on.`,
    inputSchema: sizingInputSchema,

    execute: async (input) => {
      try {
        const result = sizeSystem(input);
        collectArtifact({ kind: "sizing", result });
        return formatSizingResult(result);
      } catch (error) {
        if (error instanceof SizingInputError) {
          // A predictable input problem: hand the model something it can act
          // on conversationally rather than an error it will apologise for.
          return `NO ESTIMATE PRODUCED. ${error.message} Ask the homeowner for what is missing, then call this tool again.`;
        }
        console.error("estimateSolarSystem failed:", error);
        return "NO ESTIMATE PRODUCED. The calculator is unavailable right now. Tell the homeowner you cannot work it out at the moment and offer a callback. Do NOT estimate any figures yourself.";
      }
    },
  });
}
