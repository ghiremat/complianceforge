import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { ANNEX_IV_SECTIONS } from "@/types";

const MIN_SECTION_CONTENT_LEN = 80;

function corsAll(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

function countAnnexSections(docs: { section: number; content: string }[]): number {
  const substantive = new Set<number>();
  for (const d of docs) {
    if (
      d.section >= 1 &&
      d.section <= ANNEX_IV_SECTIONS.length &&
      (d.content?.trim().length ?? 0) >= MIN_SECTION_CONTENT_LEN
    ) {
      substantive.add(d.section);
    }
  }
  return substantive.size;
}

type RouteParams = { params: Promise<{ systemId: string }> };

export async function OPTIONS() {
  return corsAll(new NextResponse(null, { status: 204 }));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { systemId } = await params;

  const config = await db.passportConfig.findUnique({
    where: { aiSystemId: systemId },
    include: {
      aiSystem: {
        include: {
          organization: { select: { name: true } },
          documents: {
            where: { type: "annex_iv" },
            select: { section: true, content: true },
          },
          assessments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });

  if (!config?.enabled || !config.aiSystem) {
    return corsAll(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  const sys = config.aiSystem;
  const done = countAnnexSections(sys.documents);
  const total = ANNEX_IV_SECTIONS.length;
  const last = sys.assessments[0]?.createdAt;

  return corsAll(
    NextResponse.json({
      systemName: sys.name,
      orgName: sys.organization.name,
      riskTier: sys.riskTier,
      complianceScore: Math.min(100, Math.max(0, sys.complianceScore)),
      documentationStatus: `${done}/${total}`,
      lastAssessedAt: last ? last.toISOString() : null,
    })
  );
}
