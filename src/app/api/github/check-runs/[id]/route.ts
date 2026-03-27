import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing check run id" }, { status: 400 });
  }

  try {
    const run = await db.ciCheckRun.findUnique({
      where: { id: id.trim() },
      include: {
        installation: {
          select: {
            id: true,
            installationId: true,
            accountLogin: true,
            accountType: true,
            organizationId: true,
            enforcement: true,
            isActive: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Check run not found" }, { status: 404 });
    }

    let findingsParsed: unknown = null;
    try {
      findingsParsed = JSON.parse(run.findings) as unknown;
    } catch {
      findingsParsed = null;
    }

    return NextResponse.json({
      id: run.id,
      repository: run.repository,
      prNumber: run.prNumber,
      headSha: run.headSha,
      status: run.status,
      conclusion: run.conclusion,
      modelsDetected: run.modelsDetected,
      issuesFound: run.issuesFound,
      detailsUrl: run.detailsUrl,
      createdAt: run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      installation: run.installation,
      findings: findingsParsed,
    });
  } catch (e) {
    console.error("[github check-runs]", e);
    return NextResponse.json(
      { error: "Failed to load check run" },
      { status: 500 }
    );
  }
}
