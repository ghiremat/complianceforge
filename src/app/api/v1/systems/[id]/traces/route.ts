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
    select: { id: true },
  });
  if (!system) {
    return addCorsHeaders(
      NextResponse.json({ error: "System not found" }, { status: 404 }),
      request
    );
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "5";

  const auditUrl = process.env.INFERENCE_AUDIT_URL;
  if (!auditUrl) {
    return addCorsHeaders(
      NextResponse.json({ traces: [], total: 0 }, { status: 200 }),
      request
    );
  }

  try {
    const res = await fetch(
      `${auditUrl}/traces/${systemId}?limit=${limit}`,
      {
        headers: {
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
          "X-Tenant-Id": auth.ctx.organization.id,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Upstream service error" },
          { status: 502 }
        ),
        request
      );
    }

    const data = await res.json();
    const headers = new Headers(rateLimited.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    return addCorsHeaders(
      NextResponse.json(data, { status: 200, headers }),
      request
    );
  } catch {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch traces" },
        { status: 502 }
      ),
      request
    );
  }
}
