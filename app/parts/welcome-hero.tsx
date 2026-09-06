"use client";

import { Calculator, FileText, IndianRupee, Sun } from "lucide-react";
import { SunnyMark, SunnyWordmark } from "@/components/solar/brand";
import { INSTALLER_NAME_POSSESSIVE, SERVICE_AREA_TEXT } from "@/config";

const CAPABILITIES = [
  { icon: Calculator, label: "Work out your savings" },
  { icon: IndianRupee, label: "Explain the subsidy" },
  { icon: Sun, label: "Recommend a system" },
  { icon: FileText, label: "Draft a proposal" },
];

/**
 * The opening screen, shown only while a conversation is still empty.
 *
 * Its job is to answer "what is this and can it help me?" in one glance, so
 * the four capabilities are stated plainly rather than left for the homeowner
 * to discover by asking.
 */
export function WelcomeHero() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center px-4 pb-6 text-center">
      <SunnyMark size={92} priority className="drop-shadow-sm" />

      <div className="mt-3 flex flex-col items-center gap-1.5">
        <SunnyWordmark height={34} priority />
        <p className="text-sm text-muted-foreground">
          {INSTALLER_NAME_POSSESSIVE} rooftop solar assistant for {SERVICE_AREA_TEXT}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs text-brand"
          >
            <Icon className="size-3.5" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
