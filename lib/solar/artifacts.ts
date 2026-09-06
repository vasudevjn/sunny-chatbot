import type { MatchedPackage, ProposalInput, SizingResult } from "./types";

/**
 * Structured results the solar tools produce for the UI, separate from the
 * prose the model writes.
 *
 * This mirrors the template's existing source-collection pattern: tools cannot
 * reach the stream writer, so `app/api/chat/route.ts` hands each tool a
 * request-scoped collector closure and emits the collected artifacts as typed
 * data parts in `onFinish`. The result is a card the model cannot forget to
 * render and cannot misquote.
 */
export type SolarArtifact =
  | { kind: "sizing"; result: SizingResult }
  | { kind: "packages"; matches: MatchedPackage[] }
  | {
      kind: "proposal";
      ready: boolean;
      missing: string[];
      payload: Partial<ProposalInput>;
    };

export type CollectArtifact = (artifact: SolarArtifact) => void;

/** Stream part types carrying each artifact kind to the client. */
export const SIZING_PART = "data-sizing";
export const PACKAGES_PART = "data-packages";
export const PROPOSAL_PART = "data-proposal";
export const SUGGESTIONS_PART = "data-suggestions";

/**
 * Keeps only the last artifact of each kind. A homeowner who revises their
 * bill mid-conversation triggers a second estimate; the card must show the
 * current one, not both.
 */
export function latestByKind(artifacts: SolarArtifact[]): {
  sizing?: Extract<SolarArtifact, { kind: "sizing" }>;
  packages?: Extract<SolarArtifact, { kind: "packages" }>;
  proposal?: Extract<SolarArtifact, { kind: "proposal" }>;
} {
  const out: ReturnType<typeof latestByKind> = {};
  for (const artifact of artifacts) {
    if (artifact.kind === "sizing") out.sizing = artifact;
    else if (artifact.kind === "packages") out.packages = artifact;
    else if (artifact.kind === "proposal") out.proposal = artifact;
  }
  return out;
}
