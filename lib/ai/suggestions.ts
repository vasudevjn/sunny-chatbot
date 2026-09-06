/**
 * Model-generated follow-up chips for the suggested-prompts strip.
 *
 * Same "cheap utility-model call, hard fallback on any failure" shape as
 * lib/compaction.ts and lib/moderation.ts: a broken or slow call here must
 * never affect the chat answer, only leave the strip on its static table.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { getUtilityModel, utilityProviderOptions } from "@/lib/ai/model-registry";
import type { SuggestedPrompt } from "@/config";
import {
  ENABLE_WEB_SEARCH,
  ENABLE_SIZING,
  ENABLE_CATALOGUE,
  ENABLE_PROPOSAL,
  ENABLE_BILL_UPLOAD,
} from "@/config";

/** What the server knows about this homeowner's case, merged from this-turn
 * and prior-turn solar cards (see app/api/chat/route.ts). A proxy for the
 * client-only LeadStage, not identical to it — the server never sees contact
 * details, so "proposed" here means the proposal tool judged itself ready. */
export type SolarContext = {
  computedStage: "start" | "sized" | "matched" | "proposed";
  state?: string;
  discom?: string;
  monthlyUnits?: number;
  recommendedSystemKw?: number;
  tier?: string;
  netCostInr?: number;
  matchedTiers?: string[];
  proposalReady?: boolean;
};

const ICON_VALUES = [
  "sun",
  "calculator",
  "receipt",
  "panel",
  "wallet",
  "file",
  "help",
] as const;

const suggestedPromptSchema = z.object({
  label: z
    .string()
    .min(1)
    .max(28)
    .describe("Short chip text, 2-4 words, e.g. 'Explain the subsidy'."),
  prompt: z
    .string()
    .min(1)
    .max(240)
    .describe(
      "The full question, phrased exactly as the homeowner would type it themselves: first person, natural, one sentence."
    ),
  icon: z
    .enum(ICON_VALUES)
    .optional()
    .describe("Closest matching icon; omit if none fit well."),
});

const suggestionsSchema = z.object({
  suggestions: z.array(suggestedPromptSchema).min(1).max(4),
});

const SUGGESTIONS_SYSTEM = `You write short follow-up suggestions for a solar-sales chatbot's chip row, shown above the composer right after Sunny's reply.

Given what the homeowner just said, what Sunny just answered, and what is known about their case so far, propose the 1-4 questions THIS homeowner is most likely to want to ask next.

Rules:
- Phrase every "prompt" exactly as the homeowner would type it: first person, natural, no jargon, one sentence.
- Ground suggestions in what was just discussed. Never repeat a question already answered this turn or clearly settled earlier.
- Never suggest a question that needs a capability listed as disabled below.
- Prefer questions that move the conversation forward (sizing, subsidy, financing, package comparison, proposal, install process) over generic chit-chat.
- Keep "label" under 4 words — it is chip text, not the question itself.
- Return 1 to 4 suggestions, ranked most useful first.`;

function disabledFeaturesList(): string {
  const disabled: string[] = [];
  if (!ENABLE_WEB_SEARCH) disabled.push("general web search (stick to known solar/subsidy/DISCOM facts)");
  if (!ENABLE_SIZING) disabled.push("sizing/estimate tool");
  if (!ENABLE_CATALOGUE) disabled.push("package/product catalogue");
  if (!ENABLE_PROPOSAL) disabled.push("draft proposal generation");
  if (!ENABLE_BILL_UPLOAD) disabled.push("bill photo upload");
  return disabled.length ? disabled.join(", ") : "none — all features available";
}

function buildPrompt(userText: string, assistantText: string, ctx: SolarContext): string {
  const facts: string[] = [`- Stage: ${ctx.computedStage}`];
  if (ctx.state) facts.push(`- State/DISCOM: ${ctx.state}${ctx.discom ? ` / ${ctx.discom}` : ""}`);
  if (ctx.monthlyUnits) facts.push(`- Monthly units: ${ctx.monthlyUnits}`);
  if (ctx.recommendedSystemKw)
    facts.push(`- Recommended system: ${ctx.recommendedSystemKw} kW${ctx.tier ? ` (tier: ${ctx.tier})` : ""}`);
  if (ctx.netCostInr) facts.push(`- Net cost after subsidy: Rs ${ctx.netCostInr}`);
  if (ctx.matchedTiers?.length) facts.push(`- Package tiers shown: ${ctx.matchedTiers.join(", ")}`);
  if (ctx.proposalReady) facts.push(`- Draft proposal already prepared`);

  return `Homeowner just said: "${userText.slice(0, 800)}"

Sunny replied: "${assistantText.slice(0, 1500)}"

What we know about this homeowner so far:
${facts.join("\n")}

Disabled features (never suggest something needing these): ${disabledFeaturesList()}`;
}

export async function generateSuggestions(input: {
  userText: string;
  assistantText: string;
  solarContext: SolarContext;
}): Promise<SuggestedPrompt[] | null> {
  try {
    const prompt = buildPrompt(input.userText, input.assistantText, input.solarContext);
    const timeoutMs = 6000;
    const result = await Promise.race([
      generateObject({
        model: getUtilityModel(),
        schema: suggestionsSchema,
        system: SUGGESTIONS_SYSTEM,
        prompt,
        providerOptions: utilityProviderOptions(),
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("suggestions timeout")), timeoutMs)
      ),
    ]);
    return result.object.suggestions;
  } catch (error) {
    console.warn("Dynamic suggestions failed:", error);
    return null;
  }
}
