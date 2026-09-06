"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { contactSchema } from "@/lib/solar/types";
import { INSTALLER_NAME } from "@/config";
import type { Contact, ProposalInput, SizingInput } from "@/lib/solar/types";

export interface ProposalPart {
  ready: boolean;
  missing: string[];
  payload: {
    contact?: Partial<Contact>;
    sizing?: SizingInput;
    packageId?: string;
  };
}

/**
 * Renders the `data-proposal` stream part.
 *
 * Collects whatever contact details are still missing, then posts to
 * /api/proposal and saves the PDF that comes back. The document is rendered
 * server-side from a recomputed estimate, so what downloads always matches the
 * figures shown in the chat.
 */
export function ProposalCard({
  part,
  onContactSaved,
}: {
  part: ProposalPart;
  onContactSaved?: (contact: Contact) => void;
}) {
  const stored = part.payload.contact ?? {};
  const [name, setName] = useState(stored.name ?? "");
  const [phone, setPhone] = useState(stored.phone ?? "");
  const [city, setCity] = useState(stored.city ?? "");
  const [email, setEmail] = useState(stored.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const hasSizing = Boolean(part.payload.sizing);

  async function download() {
    const candidate = { name, phone, city, ...(email ? { email } : {}) };
    const parsed = contactSchema.safeParse(candidate);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    if (!part.payload.sizing) {
      toast.error("An estimate is needed first. Ask Sunny to work out your savings.");
      return;
    }

    const body: ProposalInput = {
      contact: parsed.data,
      sizing: part.payload.sizing,
      ...(part.payload.packageId ? { packageId: part.payload.packageId } : {}),
    };

    setDownloading(true);
    try {
      const response = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Could not generate the proposal.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const fileName = match?.[1] ?? "draft-solar-proposal.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      onContactSaved?.(parsed.data);
      setDownloaded(true);
      toast.success("Your draft proposal has been downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not generate the proposal."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border bg-card overflow-hidden">
      <div className="flex items-start gap-3 border-b px-4 py-3">
        <div className="mt-0.5 shrink-0 rounded-lg bg-brand-amber-soft p-1.5 text-brand-amber-strong">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold">Your draft proposal</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hasSizing
              ? "Add your details and we'll put the document together. They are used only so a representative can contact you about this proposal."
              : "An estimate is needed before a proposal can be prepared."}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="proposal-name" className="text-xs">
              Your name
            </FieldLabel>
            <Input
              id="proposal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <span className="text-xs text-red-600">{errors.name}</span>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.phone)}>
            <FieldLabel htmlFor="proposal-phone" className="text-xs">
              Mobile number
            </FieldLabel>
            <Input
              id="proposal-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile"
              inputMode="numeric"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && (
              <span className="text-xs text-red-600">{errors.phone}</span>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.city)}>
            <FieldLabel htmlFor="proposal-city" className="text-xs">
              City or town
            </FieldLabel>
            <Input
              id="proposal-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Where the roof is"
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
            />
            {errors.city && (
              <span className="text-xs text-red-600">{errors.city}</span>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="proposal-email" className="text-xs">
              Email (optional)
            </FieldLabel>
            <Input
              id="proposal-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <span className="text-xs text-red-600">{errors.email}</span>
            )}
          </Field>
        </div>

        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={download}
          disabled={downloading || !hasSizing}
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? "Preparing…" : "Download draft proposal"}
        </Button>

        {downloaded && (
          <p className="text-xs text-brand">
            Downloaded. A {INSTALLER_NAME} representative will contact you on the
            number you gave, to answer questions and arrange a site survey.
          </p>
        )}
      </div>

      <div className="space-y-1 border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
        <p>
          Your name, mobile number and city are used <strong>only</strong> so a{" "}
          {INSTALLER_NAME} representative can contact you about this proposal.
          They are not used for marketing and not shared with anyone else.
        </p>
        <p>
          This is a draft, not a binding quotation. Never share Aadhaar, PAN,
          bank or card details in this chat.
        </p>
      </div>
    </div>
  );
}
