import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

const ROLES = new Set(["admin", "member", "viewer"]);

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { role: string };

  if (!body.role || !ROLES.has(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.user.update({
    where: { id },
    data: { role: body.role },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });

  if (user) {
    await db.user.update({
      where: { id },
      data: { organizationId: null },
    });
    return NextResponse.json({ success: true });
  }

  const invitation = await db.invitation.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (invitation) {
    await db.invitation.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
