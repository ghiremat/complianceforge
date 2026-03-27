import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";

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
    select: { id: true },
  });
  if (!system) return notFound(request);

  const url = new URL(request.url);
  const sectionParam = url.searchParams.get("section");
  let sectionFilter: number | undefined;
  if (sectionParam !== null && sectionParam !== "") {
    const n = Number(sectionParam);
    if (!Number.isInteger(n) || n < 0) {
      return badRequest(request, "Invalid section query parameter");
    }
    sectionFilter = n;
  }

  const documents = await db.document.findMany({
    where: {
      aiSystemId: systemId,
      type: "annex_iv",
      ...(sectionFilter !== undefined ? { section: sectionFilter } : {}),
    },
    orderBy: [{ section: "asc" }, { updatedAt: "desc" }],
  });

  return addCorsHeaders(
    NextResponse.json({ data: documents }, { status: 200, headers: rateLimited.headers }),
    request
  );
}
