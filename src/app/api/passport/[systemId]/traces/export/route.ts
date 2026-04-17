import { NextResponse } from "next/server";
import { db } from "@/server/db";

function corsAll(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

type RouteParams = { params: Promise<{ systemId: string }> };

export async function OPTIONS() {
  return corsAll(new NextResponse(null, { status: 204 }));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { systemId } = await params;

  const config = await db.passportConfig.findUnique({
    where: { aiSystemId: systemId },
    select: { enabled: true, aiSystem: { select: { organizationId: true, name: true } } },
  });

  if (!config?.enabled) {
    return corsAll(
      NextResponse.json({ error: "Not found" }, { status: 404 })
    );
  }

  const auditUrl = process.env.INFERENCE_AUDIT_URL;
  if (!auditUrl) {
    return corsAll(
      NextResponse.json(
        { error: "Export not available" },
        { status: 503 }
      )
    );
  }

  try {
    const res = await fetch(
      `${auditUrl}/traces/${systemId}/export`,
      {
        headers: {
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
          "X-Tenant-Id": config.aiSystem.organizationId,
        },
      }
    );

    if (!res.ok) {
      return corsAll(
        NextResponse.json({ error: "Export failed" }, { status: 502 })
      );
    }

    const bundle = await res.json();
    const pdfBuffer = await generateArt13PDF(bundle, config.aiSystem.name);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="art13-${systemId}.pdf"`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return corsAll(
      NextResponse.json({ error: "Export failed" }, { status: 500 })
    );
  }
}

/**
 * Stub for PDF generation — wire up pdfkit, @react-pdf/renderer,
 * or Puppeteer to produce a real Art. 13 compliance document.
 *
 * Bundle shape from the inference-audit service:
 * {
 *   system_id, system_name, generated_at,
 *   total_traces, compliant_traces, explainability_score,
 *   traces: [{ trace_id, prompt, output, explanation, top_features, created_at }]
 * }
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
