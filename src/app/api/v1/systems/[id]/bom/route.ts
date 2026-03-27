import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import {
  bomToComponents,
  generateBomFromScan,
  repositoryScanResultFromStored,
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

const bomInclude = { components: true as const };

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
    select: { id: true },
  });
  if (!system) return notFound(request);

  const url = new URL(request.url);
  const listAll = url.searchParams.get("all") === "true" || url.searchParams.get("all") === "1";

  if (listAll) {
    const boms = await db.aiBom.findMany({
      where: { aiSystemId: systemId },
      include: bomInclude,
      orderBy: { generatedAt: "desc" },
    });
    return addCorsHeaders(
      NextResponse.json(
        { data: { boms } },
        { status: 200, headers: rateLimited.headers }
      ),
      request
    );
  }

  const bom = await db.aiBom.findFirst({
    where: { aiSystemId: systemId },
    include: bomInclude,
    orderBy: { generatedAt: "desc" },
  });

  if (!bom) {
    return addCorsHeaders(
      NextResponse.json({ error: "No BOM found for this system" }, { status: 404 }),
      request
    );
  }

  return addCorsHeaders(
    NextResponse.json({ data: { bom } }, { status: 200, headers: rateLimited.headers }),
    request
  );
}

export async function POST(request: Request, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(request, "Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest(request, "Request body must be an object");
  }

  const source = (body as { source?: unknown }).source;
  const scanResultId = (body as { scanResultId?: unknown }).scanResultId;

  if (source !== "scan" && source !== "manual") {
    return badRequest(request, 'body.source must be "scan" or "manual"');
  }

  if (source === "scan") {
    if (typeof scanResultId !== "string" || !scanResultId.trim()) {
      return badRequest(request, "scanResultId is required when source is scan");
    }

    const scan = await db.scanResult.findFirst({
      where: {
        id: scanResultId.trim(),
        organizationId: auth.ctx.organization.id,
        aiSystemId: systemId,
      },
    });

    if (!scan) {
      return addCorsHeaders(
        NextResponse.json({ error: "Scan result not found for this system" }, { status: 404 }),
        request
      );
    }

    const scanResult = repositoryScanResultFromStored(
      scan.repository,
      scan.branch,
      scan.findings
    );
    const bomData = generateBomFromScan(scanResult, system.name);
    const rows = bomToComponents(bomData);

    const bom = await db.aiBom.create({
      data: {
        aiSystemId: systemId,
        version: bomData.version,
        generatedAt: new Date(bomData.generatedAt),
        sourceType: "scan",
        scanResultId: scan.id,
        status: "draft",
        components: {
          create: rows.map((r) => ({
            componentType: r.componentType,
            name: r.name,
            version: r.version ?? null,
            provider: r.provider ?? null,
            license: r.license ?? null,
            source: r.source ?? null,
            metadata: r.metadata,
          })),
        },
      },
      include: bomInclude,
    });

    return addCorsHeaders(
      NextResponse.json({ data: { bom } }, { status: 201, headers: rateLimited.headers }),
      request
    );
  }

  const bom = await db.aiBom.create({
    data: {
      aiSystemId: systemId,
      version: "1.0",
      sourceType: "manual",
      scanResultId: null,
      status: "draft",
    },
    include: bomInclude,
  });

  return addCorsHeaders(
    NextResponse.json({ data: { bom } }, { status: 201, headers: rateLimited.headers }),
    request
  );
}
