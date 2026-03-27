import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { calculateComplianceScore } from "@/lib/compliance-scoring";
import { db } from "@/server/db";

function notFound(request: Request) {
  return addCorsHeaders(
    NextResponse.json({ error: "System not found" }, { status: 404 }),
    request
  );
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
    select: { id: true },
  });
  if (!system) return notFound(request);

  const { score, grade, criteria } = await calculateComplianceScore(systemId);

  return addCorsHeaders(
    NextResponse.json(
      { data: { score, grade, criteria } },
      { status: 200, headers: rateLimited.headers }
    ),
    request
  );
}
