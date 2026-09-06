"use client";

import { useState } from "react";
import { ChevronDown, Info, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInr, formatInrApprox, formatKw, formatPct, formatYearsShort } from "@/lib/solar/format";
import type { SizingResult } from "@/lib/solar/types";

function Figure({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={
          emphasis
            ? "text-lg font-semibold text-foreground truncate"
            : "text-sm font-medium text-foreground truncate"
        }
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Renders the `data-sizing` stream part.
 *
 * Every figure here comes straight from the calculator, not from the model's
 * prose, so the card and the chat cannot disagree.
 */
export function SizingCard({ result }: { result: SizingResult }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="mt-3 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-brand-amber-soft p-1.5 text-brand-amber-strong">
          <Sun className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {formatKw(result.recommendedSystemKw)} rooftop system
            </span>
            <Badge variant="secondary" className="font-normal">
              {result.stateName} &middot; {result.discom}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Based on about {result.monthlyUnits} units a month. Covers{" "}
            {formatPct(result.offsetFraction)} of your current usage.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 py-3 sm:grid-cols-4">
        <Figure
          label="You save"
          value={`${formatInr(result.monthlySavingsInr)}/mo`}
          emphasis
        />
        <Figure
          label="New bill"
          value={`${formatInr(result.newMonthlyBillInr)}/mo`}
          emphasis
        />
        <Figure label="Net cost" value={formatInr(result.netCostInr)} emphasis />
        <Figure
          label="Pays back in"
          value={formatYearsShort(result.paybackYears)}
          emphasis
        />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t px-4 py-3 sm:grid-cols-4">
        <Figure label="Before subsidy" value={formatInr(result.grossCostInr)} />
        <Figure
          label="Subsidy"
          value={
            result.subsidyInr > 0 ? `- ${formatInr(result.subsidyInr)}` : "None"
          }
        />
        <Figure
          label="Generates"
          value={`${result.annualGenerationKwh.toLocaleString("en-IN")} units/yr`}
        />
        <Figure label="Roof needed" value={`${result.roofAreaNeededSqft} sq ft`} />
      </div>

      <div className="border-t px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setShowDetail((v) => !v)}
          aria-expanded={showDetail}
        >
          <ChevronDown
            className={`size-3.5 transition-transform ${showDetail ? "rotate-180" : ""}`}
          />
          {showDetail ? "Hide" : "How this was worked out"}
        </Button>

        {showDetail && (
          <div className="space-y-3 px-2 pb-3 pt-2 text-xs text-muted-foreground">
            <div>
              <div className="mb-1 font-medium text-foreground">Assumptions</div>
              <ul className="list-disc space-y-1 pl-4">
                {result.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-medium text-foreground">
                Worth knowing
              </div>
              <ul className="list-disc space-y-1 pl-4">
                {result.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-2 sm:grid-cols-3">
              <Figure
                label="Upkeep"
                value={`${formatInr(result.annualOandMInr)}/yr`}
              />
              <Figure
                label="25-year saving"
                value={formatInrApprox(result.lifetimeSavingsInr)}
              />
              <Figure
                label="CO2 avoided"
                value={`${result.co2AvoidedTonnesPerYear} t/yr`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        <span>
          An estimate, not a quotation. Final design and pricing need a site
          survey.
        </span>
      </div>
    </div>
  );
}
