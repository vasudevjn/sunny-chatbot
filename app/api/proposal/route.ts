import { renderToBuffer } from "@react-pdf/renderer";
import "@/lib/env";
import { proposalInputSchema } from "@/lib/solar/types";
import { buildProposalModel, ProposalError } from "@/lib/solar/proposal";
import { ProposalDocument } from "@/lib/solar/proposal-document";
import { SizingInputError } from "@/lib/solar/sizing";
import { ENABLE_PROPOSAL } from "@/config";

// react-pdf needs Node APIs; it will not run on the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  if (!ENABLE_PROPOSAL) {
    return jsonError("Proposals are not available.", 404);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON in request body.", 400);
  }

  const parsed = proposalInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      "Missing or invalid details. A name, a 10-digit mobile number, a city and the sizing inputs are all required.",
      400
    );
  }

  try {
    // buildProposalModel recomputes every figure from the sizing inputs, so
    // nothing numeric from the client reaches the document.
    const model = buildProposalModel(parsed.data);

    // renderToBuffer expects the <Document> element itself, not a wrapper
    // component, so the builder is invoked directly. It holds no state and uses
    // no hooks, so calling it as a plain function is safe.
    const buffer = await renderToBuffer(ProposalDocument({ model }));

    // The lead, for the installer to follow up. Mirrors the logging style of
    // app/api/feedback/route.ts — swap for a CRM call when one exists.
    console.log(
      "LEAD:",
      JSON.stringify({
        reference: model.reference,
        name: model.contact.name,
        phone: model.contact.phone,
        city: model.contact.city,
        email: model.contact.email || null,
        state: model.sizing.state,
        discom: model.sizing.discom,
        monthlyUnits: model.sizing.monthlyUnits,
        systemKw: model.sizing.recommendedSystemKw,
        netCostInr: model.selected?.netPriceInr ?? model.sizing.netCostInr,
        packageId: model.selected?.pkg.id ?? null,
        createdAt: model.createdAt.toISOString(),
      })
    );

    const fileName = `${model.installer.name.replace(/[^A-Za-z0-9]+/g, "-")}-draft-proposal-${model.reference}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SizingInputError || error instanceof ProposalError) {
      return jsonError(error.message, 400);
    }
    console.error("Proposal generation failed:", error);
    return jsonError(
      "Could not generate the proposal just now. Please try again.",
      500
    );
  }
}
