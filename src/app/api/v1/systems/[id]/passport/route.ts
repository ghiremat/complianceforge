import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/api-middleware";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

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

  const { id } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id, organizationId: auth.ctx.organization.id },
    select: { id: true },
  });
  if (!system) return notFound(request);

  const passport = await db.passportConfig.upsert({
    where: { aiSystemId: id },
    create: { aiSystemId: id },
    update: {},
  });

  return addCorsHeaders(
    NextResponse.json({ data: passport }, { status: 200, headers: rateLimited.headers }),
    request
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const token =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    request.headers.get("x-forwarded-for") ??
    "anonymous";
  const rateLimited = withRateLimit(request, token);
  if (!rateLimited.ok) return addCorsHeaders(rateLimited.response, request);

  const auth = await validateApiKey(request);
  if (!auth.ok) return addCorsHeaders(auth.response, request);

  const { id } = await params;
  const existing = await db.aiSystem.findFirst({
    where: { id, organizationId: auth.ctx.organization.id },
    select: { id: true },
  });
  if (!existing) return notFound(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(request, "Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest(request, "Expected a JSON object");
  }

  const o = body as Record<string, unknown>;
  const data: Prisma.PassportConfigUpdateInput = {};

  if ("enabled" in o) {
    if (typeof o.enabled !== "boolean") {
      return badRequest(request, "enabled must be a boolean");
    }
    data.enabled = o.enabled;
  }
  if ("visibility" in o) {
    if (typeof o.visibility !== "string" || !o.visibility.trim()) {
      return badRequest(request, "visibility must be a non-empty string");
    }
    data.visibility = o.visibility.trim();
  }
  if ("customSlug" in o) {
    if (o.customSlug === null) {
      data.customSlug = null;
    } else if (typeof o.customSlug === "string") {
      const s = o.customSlug.trim();
      data.customSlug = s.length ? s : null;
    } else {
      return badRequest(request, "customSlug must be a string or null");
    }
  }
  if ("brandColor" in o) {
    if (o.brandColor === null) {
      data.brandColor = null;
    } else if (typeof o.brandColor === "string") {
      const s = o.brandColor.trim();
      data.brandColor = s.length ? s : null;
    } else {
      return badRequest(request, "brandColor must be a string or null");
    }
  }
  if ("showScore" in o) {
    if (typeof o.showScore !== "boolean") {
      return badRequest(request, "showScore must be a boolean");
    }
    data.showScore = o.showScore;
  }
  if ("showDocStatus" in o) {
    if (typeof o.showDocStatus !== "boolean") {
      return badRequest(request, "showDocStatus must be a boolean");
    }
    data.showDocStatus = o.showDocStatus;
  }
  if ("showRiskTier" in o) {
    if (typeof o.showRiskTier !== "boolean") {
      return badRequest(request, "showRiskTier must be a boolean");
    }
    data.showRiskTier = o.showRiskTier;
  }
  if ("showIncidents" in o) {
    if (typeof o.showIncidents !== "boolean") {
      return badRequest(request, "showIncidents must be a boolean");
    }
    data.showIncidents = o.showIncidents;
  }
  if ("gatedFields" in o) {
    if (Array.isArray(o.gatedFields)) {
      if (!o.gatedFields.every((x) => typeof x === "string")) {
        return badRequest(request, "gatedFields must be an array of strings");
      }
      data.gatedFields = JSON.stringify(o.gatedFields);
    } else if (typeof o.gatedFields === "string") {
      try {
        const parsed = JSON.parse(o.gatedFields) as unknown;
        if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
          return badRequest(request, "gatedFields JSON must be a string array");
        }
        data.gatedFields = o.gatedFields;
      } catch {
        return badRequest(request, "gatedFields must be valid JSON array string");
      }
    } else {
      return badRequest(request, "gatedFields must be a string array or JSON string");
    }
  }

  if (Object.keys(data).length === 0) {
    return badRequest(request, "No valid fields to update");
  }

  const createDefaults = {
    enabled: false,
    visibility: "public",
    customSlug: null as string | null,
    brandColor: null as string | null,
    showScore: true,
    showDocStatus: true,
    showRiskTier: true,
    showIncidents: false,
    gatedFields: "[]",
  };

  try {
    const { aiSystemId: _drop, ...createOverrides } = {
      aiSystemId: id,
      ...(data as Record<string, unknown>),
    };
    void _drop;

    const passport = await db.passportConfig.upsert({
      where: { aiSystemId: id },
      create: {
        aiSystemId: id,
        ...createDefaults,
        ...createOverrides,
      },
      update: data,
    });

    return addCorsHeaders(
      NextResponse.json({ data: passport }, { status: 200, headers: rateLimited.headers }),
      request
    );
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: string }).code) : "";
    if (code === "P2002") {
      return badRequest(request, "customSlug is already in use");
    }
    throw e;
  }
}
