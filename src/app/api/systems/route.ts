import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-errors";
import { db } from "@/server/db";

const createSystemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  use_case: z.string().max(500).optional(),
  sector: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  if (!session?.user?.organizationId) {
    return NextResponse.json({
      systems: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }

  const where = { organizationId: session.user.organizationId };

  const [systems, total] = await Promise.all([
    db.aiSystem.findMany({
      where,
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.aiSystem.count({ where }),
  ]);

  return NextResponse.json({
    systems: systems.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      sector: s.sector,
      use_case: s.useCase,
      role: s.role,
      risk_tier: s.riskTier,
      compliance_score: s.complianceScore,
      compliance_status: s.complianceStatus,
      org_name: s.organization.name,
      org_slug: s.organization.slug,
      source_repo: s.sourceRepo,
      created_at: s.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin" && session.user.role !== "member") {
      return forbidden("Insufficient permissions");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = createSystemSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { name, description, use_case, sector } = parsed.data;

    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, maxSystems: true, _count: { select: { aiSystems: true } } },
    });

    if (!org) {
      return notFound("Organization");
    }

    if (org._count.aiSystems >= org.maxSystems) {
      return forbidden(
        `Plan limit reached (${org.maxSystems} systems). Upgrade to add more.`
      );
    }

    const system = await db.aiSystem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        useCase: use_case?.trim() || "General",
        sector: sector?.trim() || "Other",
        organizationId: session.user.organizationId,
      },
    });

    return NextResponse.json(system, { status: 201 });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
