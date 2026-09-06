"use client";

import { BadgeCheck, PanelTop } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatInr } from "@/lib/solar/format";
import type { MatchedPackage } from "@/lib/solar/types";

const TIER_LABEL: Record<string, string> = {
  value: "Value",
  standard: "Standard",
  premium: "Premium",
};

/**
 * Renders the `data-packages` stream part.
 *
 * Specs, warranties and prices come from the catalogue, not from the model, so
 * what the homeowner reads here is what the installer actually sells.
 */
export function PackageCards({ matches }: { matches: MatchedPackage[] }) {
  if (matches.length === 0) return null;

  // "Best fit" is only claimed when the top option genuinely scores higher.
  // When several packages are the same size the order is just a price
  // tie-break, and badging the cheapest as the best fit would be a claim the
  // matcher is not making.
  const hasClearWinner =
    matches.length > 1 && matches[0].score - matches[1].score > 0.001;

  return (
    <div className="mt-3 space-y-2">
      {matches.map((m, i) => (
        <div
          key={m.pkg.id}
          className={`rounded-xl border bg-card p-4 ${i === 0 && hasClearWinner ? "ring-1 ring-brand-amber" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <PanelTop className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-semibold">{m.pkg.name}</span>
                <Badge variant="secondary" className="font-normal">
                  {TIER_LABEL[m.pkg.tier] ?? m.pkg.tier}
                </Badge>
                {i === 0 && hasClearWinner && (
                  <Badge className="bg-brand-amber-soft font-normal text-brand-amber-strong hover:bg-brand-amber-soft">
                    Best fit
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {m.pkg.panelCount} x {m.panel.brand} {m.panel.model} (
                {m.panel.wattage} W {m.panel.technology}) &middot; {m.inverter.brand}{" "}
                {m.inverter.model}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-lg font-semibold">
                {formatInr(m.netPriceInr)}
              </div>
              {m.subsidyInr > 0 ? (
                <div className="text-[11px] text-muted-foreground">
                  {formatInr(m.pkg.priceInr)} less {formatInr(m.subsidyInr)}{" "}
                  subsidy
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground">
                  no subsidy applied
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>{m.pkg.sizeKw} kW</span>
            <span>{m.pkg.phase === "three" ? "Three-phase" : "Single-phase"}</span>
            <span>
              Panels {m.panel.productWarrantyYears}y / {m.panel.performanceWarrantyYears}y
            </span>
            <span>Inverter {m.inverter.warrantyYears}y</span>
            <span>Workmanship {m.pkg.installationWarrantyYears}y</span>
            {m.pkg.dcrCompliant ? (
              <span className="inline-flex items-center gap-1 text-brand">
                <BadgeCheck className="size-3" />
                Subsidy eligible
              </span>
            ) : (
              <span className="text-brand-amber-strong">
                Not subsidy eligible
              </span>
            )}
          </div>

          {m.whyThisFits.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {m.whyThisFits.slice(0, 3).map((reason, j) => (
                <li key={j}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <p className="px-1 text-[11px] text-muted-foreground">
        Indicative prices. A site survey confirms the final design and any
        structure or wiring changes.
      </p>
    </div>
  );
}
