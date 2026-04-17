import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-errors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }

    const { id } = await params;
    const deadline = await db.complianceDeadline.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!deadline) {
      return notFound("Deadline");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const b = body as {
      title?: string;
      description?: string;
      dueDate?: string;
      priority?: string;
      status?: string;
      category?: string;
    };

    const data: Record<string, unknown> = {};
    if (b.title?.trim()) data.title = b.title.trim();
    if (b.description !== undefined) data.description = b.description;
    if (b.dueDate) data.dueDate = new Date(b.dueDate);
    if (b.priority) data.priority = b.priority;
    if (b.status) data.status = b.status;
    if (b.category) data.category = b.category;

    const updated = await db.complianceDeadline.update({ where: { id }, data });
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

    const { id } = await params;
    const deadline = await db.complianceDeadline.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!deadline) {
      return notFound("Deadline");
    }

    await db.complianceDeadline.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
