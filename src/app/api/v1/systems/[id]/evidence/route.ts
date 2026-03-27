import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/api-middleware";
import { getOrganizationActorUserId, validateApiKey } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";
import { db } from "@/server/db";
import { ANNEX_IV_SECTIONS } from "@/types";

const MIN_SECTION_CONTENT_LEN = 80;

function notFound(request: Request) {
  return addCorsHeaders(
    NextResponse.json({ error: "System not found" }, { status: 404 }),
    request
  );
}

function badRequest(request: Request, message: string) {
  return addCorsHeaders(NextResponse.json({ error: message }, { status: 400 }), request);
}

function parseEvidenceUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

type RouteParams = { params: Promise<{ id: string }> };

type PostBody = {
  type?: string;
  section?: number;
  title?: string;
  content?: string;
  url?: string;
};

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

  const documents = await db.document.findMany({
    where: { aiSystemId: systemId, type: "annex_iv" },
    orderBy: [{ section: "asc" }, { updatedAt: "desc" }],
  });

  const conformityAssessment = await db.conformityAssessment.findFirst({
    where: { aiSystemId: systemId },
    orderBy: { startedAt: "desc" },
  });

  const completedSections = new Set<number>();
  for (const d of documents) {
    if (
      d.section >= 1 &&
      d.section <= ANNEX_IV_SECTIONS.length &&
      (d.content?.trim().length ?? 0) >= MIN_SECTION_CONTENT_LEN
    ) {
      completedSections.add(d.section);
    }
  }

  const evidenceUrls = conformityAssessment
    ? parseEvidenceUrls(conformityAssessment.evidenceUrls)
    : [];

  const conformityPayload = conformityAssessment
    ? {
        ...conformityAssessment,
        evidenceUrls,
      }
    : null;

  return addCorsHeaders(
    NextResponse.json(
      {
        data: {
          documents,
          conformityAssessment: conformityPayload,
          evidenceSummary: {
            totalSections: ANNEX_IV_SECTIONS.length,
            completedSections: completedSections.size,
            evidenceUrls,
          },
        },
      },
      { status: 200, headers: rateLimited.headers }
    ),
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
    select: { id: true },
  });
  if (!system) return notFound(request);

  const authorId = await getOrganizationActorUserId(auth.ctx.organization.id);
  if (!authorId) {
    return addCorsHeaders(
      NextResponse.json(
        { error: "Organization has no users to attribute this record to" },
        { status: 400 }
      ),
      request
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(request, "Invalid JSON body");
  }

  if (!body || typeof body !== "object") {
    return badRequest(request, "Expected a JSON object");
  }

  const b = body as PostBody;
  const type = b.type;

  if (type !== "document" && type !== "evidence_url") {
    return badRequest(request, 'type must be "document" or "evidence_url"');
  }

  if (type === "document") {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const content = typeof b.content === "string" ? b.content : "";
    if (!title) return badRequest(request, "title is required for document");
    if (!content) return badRequest(request, "content is required for document");

    let section = 0;
    if (b.section !== undefined) {
      if (typeof b.section !== "number" || !Number.isInteger(b.section) || b.section < 0) {
        return badRequest(request, "section must be a non-negative integer");
      }
      section = b.section;
    }

    const created = await db.document.create({
      data: {
        aiSystemId: systemId,
        authorId,
        title,
        type: "annex_iv",
        section,
        content,
      },
    });

    return addCorsHeaders(
      NextResponse.json({ data: created }, { status: 201, headers: rateLimited.headers }),
      request
    );
  }

  const url = typeof b.url === "string" ? b.url.trim() : "";
  if (!url) return badRequest(request, "url is required for evidence_url");

  let assessment = await db.conformityAssessment.findFirst({
    where: { aiSystemId: systemId },
    orderBy: { startedAt: "desc" },
  });

  if (!assessment) {
    assessment = await db.conformityAssessment.create({
      data: {
        aiSystemId: systemId,
        assessorId: authorId,
        status: "in_progress",
        requirements: "[]",
        evidenceUrls: "[]",
        completionPct: 0,
      },
    });
  }

  const existing = parseEvidenceUrls(assessment.evidenceUrls);
  if (!existing.includes(url)) {
    existing.push(url);
  }

  const updated = await db.conformityAssessment.update({
    where: { id: assessment.id },
    data: { evidenceUrls: JSON.stringify(existing) },
  });

  return addCorsHeaders(
    NextResponse.json(
      {
        data: {
          conformityAssessment: {
            ...updated,
            evidenceUrls: existing,
          },
        },
      },
      { status: 200, headers: rateLimited.headers }
    ),
    request
  );
}
