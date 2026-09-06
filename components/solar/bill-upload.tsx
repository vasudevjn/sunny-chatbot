"use client";

import { useCallback, useRef } from "react";
import { Check, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/config";
import {
  fileToUploadPayload,
  isAllowedUploadType,
  MAX_UPLOAD_MB,
} from "@/lib/solar/bill";
import type { BillExtraction } from "@/lib/solar/types";

export type UploadState =
  | { status: "idle" }
  | { status: "reading"; fileName: string }
  | { status: "done"; fileName: string }
  | { status: "error"; fileName: string; message: string };

/**
 * The paperclip in the composer.
 *
 * The file goes to /api/extract and comes back as typed fields. The image
 * itself never enters the transcript — only the extracted summary does — so a
 * bill photo costs one model call rather than re-entering context every turn.
 *
 * Upload status is reported to the parent rather than drawn here: the pill
 * belongs in the strip above the composer, where it does not sit on top of the
 * conversation.
 */
export function BillUploadButton({
  onExtracted,
  onStatusChange,
  disabled,
  busy,
}: {
  onExtracted: (bill: BillExtraction, fileName: string) => void;
  onStatusChange: (state: UploadState) => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAllowedUploadType(file.type)) {
        toast.error("Upload a photo or PDF of your bill (JPG, PNG, WEBP or PDF).");
        return;
      }
      // Checked again after downscaling, but catching it here saves the user a
      // pointless wait on an obviously oversized file.
      if (file.type === "application/pdf" && file.size > MAX_UPLOAD_BYTES) {
        toast.error(
          `That PDF is over ${MAX_UPLOAD_MB} MB. Try a photo of the first page instead.`
        );
        return;
      }

      onStatusChange({ status: "reading", fileName: file.name });

      try {
        const payload = await fileToUploadPayload(file);

        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Could not read that bill.");
        }

        const { extraction } = (await response.json()) as {
          extraction: BillExtraction;
        };

        onStatusChange({ status: "done", fileName: file.name });
        onExtracted(extraction, file.name);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Could not read that bill.";
        onStatusChange({ status: "error", fileName: file.name, message });
        toast.error(message);
      }
    },
    [onExtracted, onStatusChange]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_UPLOAD_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-picking the same file fires change again.
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute bottom-2.5 left-2.5 size-8 rounded-full text-muted-foreground hover:text-foreground"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload your electricity bill"
        title="Upload your electricity bill"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Paperclip className="size-4" />
        )}
      </Button>
    </>
  );
}

/** The upload status pill, rendered in the strip above the composer. */
export function BillUploadStatus({
  state,
  onDismiss,
}: {
  state: UploadState;
  onDismiss: () => void;
}) {
  if (state.status === "idle") return null;

  return (
    <div className="mb-2 flex">
      <div className="flex min-w-0 items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
        {state.status === "reading" && (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        )}
        {state.status === "done" && (
          <Check className="size-3 shrink-0 text-green-600" />
        )}
        {state.status === "error" && (
          <X className="size-3 shrink-0 text-red-600" />
        )}
        <span className="truncate">{state.fileName}</span>
        <span className="shrink-0">
          {state.status === "reading" && "reading…"}
          {state.status === "done" && "read"}
          {state.status === "error" && "could not be read"}
        </span>
        {state.status !== "reading" && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-full p-0.5 hover:bg-accent"
            aria-label="Dismiss"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}
