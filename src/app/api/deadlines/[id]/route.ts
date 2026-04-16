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
  const deadline = await db.complianceDeadline.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!deadline) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    category?: string;
  };

  const data: Record<string, unknown> = {};
  if (body.title?.trim()) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description;
  if (body.dueDate) data.dueDate = new Date(body.dueDate);
  if (body.priority) data.priority = body.priority;
  if (body.status) data.status = body.status;
  if (body.category) data.category = body.category;

  const updated = await db.complianceDeadline.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deadline = await db.complianceDeadline.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!deadline) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.complianceDeadline.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
