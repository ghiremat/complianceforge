import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
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
    select: { id: true },
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
        { error: "Inference audit service not configured" },
        { status: 503 }
      ),
      request
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return addCorsHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      request
    );
  }

  try {
    const res = await fetch(`${auditUrl}/traces/${systemId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
        "X-Tenant-Id": auth.ctx.organization.id,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return addCorsHeaders(
        NextResponse.json(
          { error: "Upstream service error", detail: errBody },
          { status: 502 }
        ),
        request
      );
    }

    const data = await res.json();
    const headers = new Headers(rateLimited.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    return addCorsHeaders(
      NextResponse.json(data, { status: 201, headers }),
      request
    );
  } catch {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to submit trace" },
        { status: 502 }
      ),
      request
    );
  }
}
