import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const systemId = searchParams.get("systemId");

  const where = {
    aiSystem: { organizationId: session.user.organizationId },
    ...(systemId ? { aiSystemId: systemId } : {}),
  };

  const incidents = await db.incident.findMany({
    where,
    include: {
      aiSystem: { select: { name: true } },
      reporter: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    incidents.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      systemId: i.aiSystemId,
      systemName: i.aiSystem.name,
      reportedBy: i.reporter.name || i.reporter.email || "Unknown",
      resolvedAt: i.status === "resolved" ? i.updatedAt : null,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title: string;
    description?: string;
    severity: string;
    systemId: string;
  };

  if (!body.title?.trim() || !body.systemId) {
    return NextResponse.json({ error: "Title and system are required" }, { status: 400 });
  }

  const system = await db.aiSystem.findFirst({
    where: { id: body.systemId, organizationId: session.user.organizationId },
  });
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const now = new Date();
  const incident = await db.incident.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() ?? "",
      severity: body.severity || "medium",
      status: "open",
      aiSystemId: body.systemId,
      reporterId: session.user.id,
      occurredAt: now,
      detectedAt: now,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      aiSystemId: body.systemId,
      action: "create",
      resource: "incident",
      resourceId: incident.id,
      details: JSON.stringify({ title: incident.title, severity: incident.severity }),
    },
  });

  return NextResponse.json(incident, { status: 201 });
}
