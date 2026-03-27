import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import {
  aiBomDataFromStored,
  exportBomAsCycloneDx,
  exportBomAsYaml,
} from "@/lib/ai-bom";

function notFound(request: Request) {
  return addCorsHeaders(
    NextResponse.json({ error: "System not found" }, { status: 404 }),
    request
  );
}

function badRequest(request: Request, message: string) {
  return addCorsHeaders(NextResponse.json({ error: message }, { status: 400 }), request);
}

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
  if (!system) return notFound(request);

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  if (format !== "yaml" && format !== "cyclonedx" && format !== "json") {
    return badRequest(request, 'format must be "yaml", "cyclonedx", or "json"');
  }

  const bom = await db.aiBom.findFirst({
    where: { aiSystemId: systemId },
    include: { components: true },
    orderBy: { generatedAt: "desc" },
  });

  if (!bom) {
    return addCorsHeaders(
      NextResponse.json({ error: "No BOM found for this system" }, { status: 404 }),
      request
    );
  }

  const bomData = aiBomDataFromStored(system.name, bom, bom.components);

  const headers = new Headers(rateLimited.headers);
  if (format === "yaml") {
    const body = exportBomAsYaml(bomData);
    headers.set("Content-Type", "text/yaml; charset=utf-8");
    return addCorsHeaders(
      new NextResponse(body, { status: 200, headers }),
      request
    );
  }

  if (format === "cyclonedx") {
    const payload = exportBomAsCycloneDx(bomData);
    headers.set("Content-Type", "application/json; charset=utf-8");
    return addCorsHeaders(
      NextResponse.json(payload, { status: 200, headers }),
      request
    );
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  return addCorsHeaders(
    NextResponse.json(bomData, { status: 200, headers }),
    request
  );
}
