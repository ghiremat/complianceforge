import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

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

  const body = await request.json();
  const { name, description, use_case, sector } = body as {
    name?: string;
    description?: string;
    use_case?: string;
    sector?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

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
