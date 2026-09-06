import { tool } from "ai";
import { z } from "zod";
import { contactSchema, sizingInputSchema } from "@/lib/solar/types";
import { missingForProposal } from "@/lib/solar/proposal";
import { getPackage } from "@/lib/solar/data/catalogue";
import type { CollectArtifact } from "@/lib/solar/artifacts";
import { INSTALLER_NAME } from "@/config";

/**
 * Prepares — but does not render — the draft proposal.
 *
 * The PDF is built by /api/proposal when the homeowner clicks Download, so the
 * binary never travels through the chat stream and the document is always
 * rendered from a server-side recompute. This tool's job is to check the lead
 * is complete and hand the UI a payload.
 */
export function createPrepareProposal(collectArtifact: CollectArtifact) {
  return tool({
    description:
      `Prepare a draft proposal document for the homeowner to download. ` +
      `Call this when they ask for a proposal, a quote, or something in writing. ` +
      `It needs a completed savings estimate plus their name, mobile number and city — ${INSTALLER_NAME} uses these to follow up. ` +
      `If anything is missing, it says what: ask for those conversationally, then call it again. ` +
      `Pass the same sizing inputs you gave estimateSolarSystem, and the package id if they have chosen one.`,
    inputSchema: z.object({
      contact: contactSchema
        .partial()
        .describe(
          "What you have so far. Pass only what the homeowner has actually told you; never invent a name or number."
        ),
      sizing: sizingInputSchema
        .optional()
        .describe(
          "The same inputs you passed to estimateSolarSystem. Required before a proposal can be produced."
        ),
      packageId: z
        .string()
        .optional()
        .describe(
          "The [id: ...] of the package they chose, from matchSolarProducts. Omit if they have not picked one."
        ),
    }),

    execute: async ({ contact, sizing, packageId }) => {
      const missing = missingForProposal({
        contact,
        hasSizing: Boolean(sizing),
      });

      if (packageId && !getPackage(packageId)) {
        return `CANNOT PREPARE PROPOSAL. "${packageId}" is not a package in the catalogue. Run matchSolarProducts and use one of the ids it returns, or omit the package.`;
      }

      collectArtifact({
        kind: "proposal",
        ready: missing.length === 0,
        missing,
        payload: { contact: contact as never, sizing, packageId },
      });

      if (missing.length > 0) {
        return (
          `PROPOSAL NOT READY. Still needed: ${missing.join(", ")}.\n\n` +
          `Ask for these naturally, in one short message — not as a form. Explain that ${INSTALLER_NAME} needs them to follow up. ` +
          `A form has been shown to the homeowner where they can type their details directly, so you can simply invite them to fill it in or tell you. ` +
          `Do NOT invent any of these details.`
        );
      }

      return (
        `PROPOSAL READY. A download button has been shown to the homeowner. ` +
        `Tell them their draft proposal is ready to download, and say briefly what it contains: the system, the costs and subsidy, the savings over time, financing options and the steps that follow. ` +
        `Remind them once that it is a draft, not a binding quotation, and that a site survey confirms the final design.`
      );
    },
  });
}
