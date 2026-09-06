import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_IMAGE_MAX_EDGE,
  UPLOAD_IMAGE_QUALITY,
} from "@/config";
import { formatInr } from "./format";
import type { BillExtraction } from "./types";

export const STATE_LABELS: Record<string, string> = {
  GJ: "Gujarat",
  MH: "Maharashtra",
  OTHER: "outside Gujarat and Maharashtra",
};

export function isAllowedUploadType(type: string): boolean {
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(type);
}

/**
 * Shrinks a photo before upload.
 *
 * A modern phone camera produces 4-8 MB images, well past the request limit,
 * and none of that resolution helps read a bill. Downscaling in the browser
 * turns most uploads into a few hundred KB and removes the commonest failure
 * before the user ever sees an error. PDFs pass through untouched.
 */
export async function fileToUploadPayload(
  file: File
): Promise<{ data: string; mediaType: string; fileName: string }> {
  const fileName = file.name;

  if (file.type === "application/pdf") {
    const data = await fileToBase64(file);
    return { data, mediaType: file.type, fileName };
  }

  try {
    const resized = await downscaleImage(file);
    return { data: resized, mediaType: "image/jpeg", fileName };
  } catch {
    // Canvas can fail on exotic formats or a tainted context. Fall back to the
    // original bytes and let the server's size check decide.
    const data = await fileToBase64(file);
    return { data, mediaType: file.type, fileName };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.replace(/^data:[^;]+;base64,/, ""));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downscaleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const longest = Math.max(img.width, img.height);
      const scale = longest > UPLOAD_IMAGE_MAX_EDGE ? UPLOAD_IMAGE_MAX_EDGE / longest : 1;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/jpeg", UPLOAD_IMAGE_QUALITY);
      resolve(dataUrl.replace(/^data:[^;]+;base64,/, ""));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };

    img.src = url;
  });
}

/** Human-readable size limit, for error messages. */
export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

/**
 * Turns an extraction into the message that enters the transcript.
 *
 * The image itself never becomes a message part: it would re-enter the model's
 * context on every subsequent turn and would overflow localStorage. This
 * compact summary carries everything the sizing engine needs, and carries the
 * confidence honestly so Sunny knows when to confirm before quoting.
 */
export function summariseBillForChat(bill: BillExtraction): string {
  const facts: string[] = [];

  if (bill.discom) facts.push(bill.discom);
  if (bill.state && STATE_LABELS[bill.state]) {
    facts.push(STATE_LABELS[bill.state]);
  }
  if (bill.unitsConsumed != null) facts.push(`${bill.unitsConsumed} units`);
  if (bill.billAmountInr != null) facts.push(formatInr(bill.billAmountInr));
  if (bill.billingMonth) facts.push(`for ${bill.billingMonth}`);
  if (bill.sanctionedLoadKw != null) {
    facts.push(`sanctioned load ${bill.sanctionedLoadKw} kW`);
  }
  if (bill.connectionPhase) {
    facts.push(`${bill.connectionPhase}-phase`);
  }
  if (bill.tariffCategory) facts.push(bill.tariffCategory);

  const lines: string[] = [];
  lines.push(
    facts.length > 0
      ? `I've uploaded my electricity bill. From it: ${facts.join(", ")}.`
      : "I've uploaded my electricity bill, but none of the details could be read from it."
  );

  // Anything short of a confident reading has to be confirmed before it can
  // become a price. A blurry scan will happily report a wrong unit count at
  // "medium" confidence, and that number would otherwise flow into a quote.
  const needsConfirming =
    bill.confidence !== "high" ||
    bill.warnings.length > 0 ||
    bill.unitsConsumed == null ||
    bill.billAmountInr == null;

  if (needsConfirming) {
    const issues = [...bill.warnings];
    if (bill.unitsConsumed == null) issues.push("units consumed could not be read");
    if (bill.billAmountInr == null) issues.push("bill amount could not be read");
    lines.push(
      `(Reading confidence: ${bill.confidence}. ${issues.join("; ")}. Please check these figures with me before working out any numbers.)`
    );
  }

  return lines.join("\n\n");
}
