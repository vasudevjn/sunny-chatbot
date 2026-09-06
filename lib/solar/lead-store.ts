/**
 * Per-conversation lead state, in the browser only.
 *
 * Holds what Sunny has learned about this homeowner across turns: their bill,
 * the latest estimate, the packages shown, and their contact details once they
 * ask for a proposal. Nothing here is sent to the model — the model's own
 * context is the conversation. This exists so the UI can show the right
 * suggested prompts, prefill the proposal form, and avoid asking twice.
 *
 * Follows the conventions in lib/storage.ts: one key per conversation, every
 * access wrapped so a private window or a cleared store degrades to "no lead"
 * rather than throwing.
 */

import type {
  BillExtraction,
  Contact,
  LeadStage,
  SizingInput,
  SizingResult,
  SolarLead,
} from "./types";

const LEAD_PREFIX = "sunny-lead-";

function key(conversationId: string): string {
  return `${LEAD_PREFIX}${conversationId}`;
}

const EMPTY_LEAD: SolarLead = { stage: "start", updatedAt: 0 };

export function loadLead(conversationId: string | null | undefined): SolarLead {
  if (!conversationId || typeof window === "undefined") return EMPTY_LEAD;
  try {
    const raw = localStorage.getItem(key(conversationId));
    if (!raw) return EMPTY_LEAD;
    const parsed = JSON.parse(raw) as SolarLead;
    return { ...EMPTY_LEAD, ...parsed };
  } catch {
    return EMPTY_LEAD;
  }
}

function persist(conversationId: string, lead: SolarLead) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(conversationId), JSON.stringify(lead));
  } catch {
    // Quota exceeded or storage disabled — the lead is a convenience, not a
    // source of truth, so losing it must never break the chat.
  }
}

/**
 * Merges a partial update into the stored lead and recomputes the stage.
 * Returns the new lead so callers can update React state in the same tick.
 */
export function updateLead(
  conversationId: string | null | undefined,
  patch: Partial<Omit<SolarLead, "stage" | "updatedAt">>
): SolarLead {
  if (!conversationId) return EMPTY_LEAD;
  const current = loadLead(conversationId);
  const merged: SolarLead = {
    ...current,
    ...patch,
    stage: current.stage,
    updatedAt: Date.now(),
  };
  merged.stage = deriveStage(merged);
  persist(conversationId, merged);
  return merged;
}

export function clearLead(conversationId: string | null | undefined) {
  if (!conversationId || typeof window === "undefined") return;
  try {
    localStorage.removeItem(key(conversationId));
  } catch {
    // Nothing to do — see persist().
  }
}

/**
 * Where this homeowner is in the journey. Drives which suggested prompts show.
 * Derived rather than stored so it can never fall out of step with the data.
 */
export function deriveStage(lead: SolarLead): LeadStage {
  if (lead.contact && lead.selectedPackageId) return "proposed";
  if (lead.matchedPackageIds && lead.matchedPackageIds.length > 0)
    return "matched";
  if (lead.sizingResult) return "sized";
  return "start";
}

// --- Convenience writers, one per producer -------------------------------

export function saveBillExtraction(
  conversationId: string | null | undefined,
  bill: BillExtraction
): SolarLead {
  return updateLead(conversationId, { bill });
}

export function saveSizing(
  conversationId: string | null | undefined,
  sizingResult: SizingResult,
  sizingInput?: SizingInput
): SolarLead {
  return updateLead(conversationId, { sizingResult, sizingInput });
}

export function saveMatches(
  conversationId: string | null | undefined,
  matchedPackageIds: string[]
): SolarLead {
  return updateLead(conversationId, { matchedPackageIds });
}

export function saveContact(
  conversationId: string | null | undefined,
  contact: Contact
): SolarLead {
  return updateLead(conversationId, { contact });
}

export function saveSelectedPackage(
  conversationId: string | null | undefined,
  selectedPackageId: string
): SolarLead {
  return updateLead(conversationId, { selectedPackageId });
}

/**
 * Rebuilds the sizing inputs for a follow-up call (the proposal route needs
 * them). Prefers what the homeowner actually told us over anything derived.
 */
export function sizingInputFromLead(lead: SolarLead): SizingInput | undefined {
  if (lead.sizingInput) return lead.sizingInput;
  const result = lead.sizingResult;
  if (!result) return undefined;
  return {
    state: result.state,
    monthlyUnits: result.monthlyUnits,
    discom: result.discom,
    tier: result.tier,
  };
}
