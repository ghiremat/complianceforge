import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { calculateComplianceScore } from "@/lib/compliance-scoring";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
    include: {
      organization: { select: { name: true, slug: true } },
      assessments: { orderBy: { createdAt: "desc" }, take: 5 },
      documents: { orderBy: { updatedAt: "desc" }, take: 10 },
      incidents: { orderBy: { createdAt: "desc" }, take: 5 },
      scanResults: { orderBy: { scanDate: "desc" }, take: 5 },
      passportConfig: true,
    },
  });

  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const { score, grade, criteria } = await calculateComplianceScore(systemId);

  return NextResponse.json({
    id: system.id,
    name: system.name,
    description: system.description,
    sector: system.sector,
    useCase: system.useCase,
    provider: system.provider,
    version: system.version,
    deploymentRegion: system.deploymentRegion,
    riskTier: system.riskTier,
    complianceScore: score,
    complianceGrade: grade,
    complianceStatus: system.complianceStatus,
    sourceRepo: system.sourceRepo,
    orgName: system.organization.name,
    orgSlug: system.organization.slug,
    createdAt: system.createdAt,
    updatedAt: system.updatedAt,
    scoreCriteria: criteria,
    assessments: system.assessments.map((a) => ({
      id: a.id,
      type: a.type,
      riskTier: a.riskTier,
      confidence: a.confidence,
      justification: a.justification,
      createdAt: a.createdAt,
    })),
    documents: system.documents.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      section: d.section,
      status: d.status,
      updatedAt: d.updatedAt,
    })),
    incidents: system.incidents.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      createdAt: i.createdAt,
    })),
    scanResults: system.scanResults.map((s) => ({
      id: s.id,
      repository: s.repository,
      totalFindings: s.totalFindings,
      scanDate: s.scanDate,
    })),
    passport: system.passportConfig
      ? {
          enabled: system.passportConfig.enabled,
          customSlug: system.passportConfig.customSlug,
        }
      : null,
  });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    sector?: string;
    useCase?: string;
    provider?: string;
    version?: string;
    deploymentRegion?: string;
    sourceRepo?: string;
  };

  const data: Record<string, string | null> = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.sector?.trim()) data.sector = body.sector.trim();
  if (body.useCase?.trim()) data.useCase = body.useCase.trim();
  if (body.provider !== undefined) data.provider = body.provider?.trim() || null;
  if (body.version !== undefined) data.version = body.version?.trim() || null;
  if (body.deploymentRegion !== undefined) {
    data.deploymentRegion = body.deploymentRegion?.trim() || "EU";
  }
  if (body.sourceRepo !== undefined) data.sourceRepo = body.sourceRepo?.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await db.aiSystem.update({
    where: { id: systemId },
    data,
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      aiSystemId: systemId,
      action: "update",
      resource: "ai_system",
      resourceId: systemId,
      details: JSON.stringify(data),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      action: "delete",
      resource: "ai_system",
      resourceId: systemId,
      details: JSON.stringify({ name: system.name }),
    },
  });

  await db.aiSystem.delete({ where: { id: systemId } });

  return NextResponse.json({ success: true });
}
