import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { calculateComplianceScore } from "@/lib/compliance-scoring";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-errors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

const updateSystemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  version: z.string().max(50).optional(),
  vendor: z.string().max(200).optional(),
  purpose: z.string().max(5000).optional(),
  riskTier: z.enum(["unacceptable", "high", "limited", "minimal", "unassessed"]).optional(),
  role: z.enum(["provider", "deployer"]).optional(),
  sector: z.string().max(200).optional(),
  useCase: z.string().max(5000).optional(),
  provider: z.string().max(200).optional(),
  deploymentRegion: z.string().max(50).optional(),
  sourceRepo: z.string().max(500).optional(),
});

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
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
      return notFound("System");
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
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { id: systemId } = await params;
    const system = await db.aiSystem.findFirst({
      where: { id: systemId, organizationId: session.user.organizationId },
    });
    if (!system) {
      return notFound("System");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = updateSystemSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const b = parsed.data;
    const data: Record<string, string | null> = {};

    if (b.name?.trim()) data.name = b.name.trim();
    if (b.description !== undefined) data.description = b.description?.trim() || null;
    if (b.version !== undefined) data.version = b.version?.trim() || null;

    const providerVal = b.vendor !== undefined ? b.vendor : b.provider;
    if (providerVal !== undefined) data.provider = providerVal?.trim() || null;

    const useCaseVal = b.purpose !== undefined ? b.purpose : b.useCase;
    if (useCaseVal !== undefined && useCaseVal.trim()) data.useCase = useCaseVal.trim();

    if (b.sector?.trim()) data.sector = b.sector.trim();
    if (b.deploymentRegion !== undefined) {
      data.deploymentRegion = b.deploymentRegion?.trim() || "EU";
    }
    if (b.sourceRepo !== undefined) data.sourceRepo = b.sourceRepo?.trim() || null;
    if (b.riskTier !== undefined) data.riskTier = b.riskTier;
    if (b.role !== undefined) data.role = b.role;

    if (Object.keys(data).length === 0) {
      return badRequest("No changes");
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
  } catch (e) {
    console.error(e);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    const { id: systemId } = await params;
    const system = await db.aiSystem.findFirst({
      where: { id: systemId, organizationId: session.user.organizationId },
    });
    if (!system) {
      return notFound("System");
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
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
