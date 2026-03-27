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

function parseJsonArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
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
  });
  if (!system) return notFound(request);

  const latestAssessment = await db.assessment.findFirst({
    where: { aiSystemId: systemId },
    orderBy: { createdAt: "desc" },
  });

  const { score, grade, criteria } = await calculateComplianceScore(systemId);
  const gaps = criteria.filter((c) => c.earned < c.max);

  const assessmentPayload = latestAssessment
    ? {
        justification: latestAssessment.justification,
        requirements: parseJsonArray(latestAssessment.requirements),
        recommendations: parseJsonArray(latestAssessment.recommendations),
      }
    : {
        justification: "",
        requirements: [] as unknown[],
        recommendations: [] as unknown[],
      };

  return addCorsHeaders(
    NextResponse.json(
      {
        data: {
          systemId,
          riskTier: system.riskTier,
          complianceScore: score,
          grade,
          gaps,
          assessment: assessmentPayload,
        },
      },
      { status: 200, headers: rateLimited.headers }
    ),
    request
  );
}
