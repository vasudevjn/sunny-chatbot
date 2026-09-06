"use client";

import {
  Calculator,
  FileText,
  HelpCircle,
  PanelTop,
  Receipt,
  Sun,
  Wallet,
} from "lucide-react";
import { SUGGESTED_PROMPTS, type SuggestedPrompt } from "@/config";
import type { LeadStage } from "@/lib/solar/types";

const ICONS = {
  sun: Sun,
  calculator: Calculator,
  receipt: Receipt,
  panel: PanelTop,
  wallet: Wallet,
  file: FileText,
  help: HelpCircle,
} as const;

function Chip({
  prompt,
  onSelect,
  disabled,
}: {
  prompt: SuggestedPrompt;
  onSelect: (text: string) => void;
  disabled?: boolean;
}) {
  const Icon = prompt.icon ? ICONS[prompt.icon] : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(prompt.prompt)}
      title={prompt.prompt}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      {prompt.label}
    </button>
  );
}

/**
 * The suggested prompts strip above the composer.
 *
 * Which chips show depends on how far the homeowner has got: before an
 * estimate they are offered ways to get one, afterwards the subsidy and
 * products, and once they have seen products, the proposal. The stage comes
 * from the stored lead, so the strip advances the conversation rather than
 * repeating what has already happened.
 */
export function SuggestedPrompts({
  stage,
  onSelect,
  disabled,
  compact = false,
}: {
  stage: LeadStage;
  onSelect: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const prompts = SUGGESTED_PROMPTS[stage] ?? SUGGESTED_PROMPTS.start;
  if (prompts.length === 0) return null;

  // After the conversation has started, the strip is a quiet single row rather
  // than a menu competing with the transcript.
  const visible = compact ? prompts.slice(0, 3) : prompts;

  return (
    <div
      className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="group"
      aria-label="Suggested questions"
    >
      {visible.map((prompt) => (
        <Chip
          key={prompt.label}
          prompt={prompt}
          onSelect={onSelect}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
