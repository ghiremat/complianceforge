import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const incident = await db.incident.findFirst({
    where: { id },
    include: { aiSystem: { select: { organizationId: true } } },
  });

  if (!incident || incident.aiSystem.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    status?: string;
    severity?: string;
    description?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.severity) data.severity = body.severity;
  if (body.description !== undefined) data.description = body.description;

  const updated = await db.incident.update({ where: { id }, data });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      aiSystemId: incident.aiSystemId,
      action: "update",
      resource: "incident",
      resourceId: id,
      details: JSON.stringify(data),
    },
  });

  return NextResponse.json(updated);
}
