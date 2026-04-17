import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/server/db";

const createSystemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  use_case: z.string().max(500).optional(),
  sector: z.string().max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json([], { status: 200 });
  }

  const systems = await db.aiSystem.findMany({
    where: { organizationId: session.user.organizationId },
    include: { organization: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    systems.map((s) => ({
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
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "member") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSystemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, description, use_case, sector } = parsed.data;

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { id: true, maxSystems: true, _count: { select: { aiSystems: true } } },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org._count.aiSystems >= org.maxSystems) {
    return NextResponse.json(
      { error: `Plan limit reached (${org.maxSystems} systems). Upgrade to add more.` },
      { status: 403 }
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
}
