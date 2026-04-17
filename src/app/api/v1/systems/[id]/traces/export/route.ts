import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

export async function GET(request: Request, { params }: RouteParams) {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const rateLimited = withRateLimit(request, token);
  if (!rateLimited.ok) return addCorsHeaders(rateLimited.response, request);

  const auth = await validateApiKey(request);
  if (!auth.ok) return addCorsHeaders(auth.response, request);

  const { id: systemId } = await params;

  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: auth.ctx.organization.id },
    select: { id: true, name: true },
  });
  if (!system) {
    return addCorsHeaders(
      NextResponse.json({ error: "System not found" }, { status: 404 }),
      request
    );
  }

  const auditUrl = process.env.INFERENCE_AUDIT_URL;
  if (!auditUrl) {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Export not available — inference audit service not configured" },
        { status: 503 }
      ),
      request
    );
  }

  try {
    const res = await fetch(
      `${auditUrl}/traces/${systemId}/export`,
      {
        headers: {
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
          "X-Tenant-Id": auth.ctx.organization.id,
        },
      }
    );

    if (!res.ok) {
      return addCorsHeaders(
        NextResponse.json({ error: "Upstream export failed" }, { status: 502 }),
        request
      );
    }

    const bundle = await res.json();
    const pdfBuffer = await generateArt13PDF(bundle, system.name);

    const resp = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="art13-${systemId}.pdf"`,
        ...rateLimited.headers,
      },
    });
    return addCorsHeaders(resp, request);
  } catch {
    return addCorsHeaders(
      NextResponse.json({ error: "Export failed" }, { status: 500 }),
      request
    );
  }
}

/**
 * Stub — replace with pdfkit / @react-pdf/renderer / Puppeteer.
 *
 * Bundle shape:
 * { system_id, system_name, generated_at,
 *   total_traces, compliant_traces, explainability_score,
 *   traces: [{ trace_id, prompt, output, explanation, top_features, created_at }] }
 */
async function generateArt13PDF(
  bundle: Record<string, unknown>,
  systemName: string
): Promise<Buffer> {
  const lines = [
    "Art. 13 EU AI Act — Explainability Evidence Report",
    `System: ${systemName}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total traces: ${bundle.total_traces ?? "N/A"}`,
    `Compliant traces: ${bundle.compliant_traces ?? "N/A"}`,
    `Score: ${bundle.explainability_score ?? "N/A"}%`,
    "",
    "--- Trace Details ---",
    JSON.stringify(bundle.traces ?? [], null, 2),
  ];

  return Buffer.from(lines.join("\n"), "utf-8");
}
