/**
 * Rotating status labels for different processing phases.
 * Each category maps to a phase of the assistant's pipeline.
 *
 * Kept plain and literal: a homeowner deciding on a large purchase reads
 * playful status text as evasive, so these say what is actually happening.
 */

export const FUN_LABELS = {
  thinking: [
    "Thinking",
    "Working it out",
    "Considering",
    "Looking at this",
  ],
  processing: [
    "Going through the details",
    "Putting this together",
    "Working through it",
    "Making sense of this",
  ],
  knowledgeBase: [
    "Checking the details",
    "Looking this up",
    "Checking the scheme rules",
    "Finding the specifics",
  ],
  webSearch: [
    "Checking for updates",
    "Looking online",
    "Checking the latest",
  ],
  calculating: [
    "Working out your numbers",
    "Sizing the system",
    "Calculating savings",
    "Running the figures",
  ],
  matching: [
    "Matching systems to your roof",
    "Comparing options",
    "Finding the right fit",
  ],
  proposal: [
    "Preparing your proposal",
    "Pulling the details together",
    "Drafting the document",
  ],
  assembling: [
    "Writing this up",
    "Putting the answer together",
    "Finishing up",
  ],
  compacting: [
    "Making a note of our conversation so far",
    "Summarising what we have covered",
    "Keeping track of the details",
  ],
} as const;

export type FunLabelCategory = keyof typeof FUN_LABELS;

/** Pick a random label from a category, optionally excluding a specific one. */
export function pickRandom(
  category: FunLabelCategory,
  exclude?: string
): string {
  const labels = FUN_LABELS[category];
  const candidates = exclude
    ? labels.filter((l) => l !== exclude)
    : [...labels];
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Past-tense completions for result labels.
 * Maps the in-progress label to a suitable past-tense version.
 */
export const PAST_TENSE: Record<FunLabelCategory, string[]> = {
  thinking: ["Thought about it", "Worked it out", "Considered it"],
  processing: [
    "Went through the details",
    "Put it together",
    "Worked through it",
  ],
  knowledgeBase: [
    "Checked the details",
    "Looked it up",
    "Checked the scheme rules",
  ],
  webSearch: ["Checked for updates", "Looked online", "Checked the latest"],
  calculating: [
    "Worked out your numbers",
    "Sized the system",
    "Calculated the savings",
  ],
  matching: [
    "Matched systems to your roof",
    "Compared the options",
    "Found the right fit",
  ],
  proposal: [
    "Prepared your proposal",
    "Pulled the details together",
    "Drafted the document",
  ],
  assembling: ["Wrote it up", "Put the answer together", "Finished up"],
  compacting: [
    "Made a note of our conversation",
    "Summarised what we have covered",
  ],
};

export function pickRandomPastTense(category: FunLabelCategory): string {
  const labels = PAST_TENSE[category];
  return labels[Math.floor(Math.random() * labels.length)];
}
