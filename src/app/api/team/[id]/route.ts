import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api-errors";
import { db } from "@/server/db";

type RouteParams = { params: Promise<{ id: string }> };

const ROLES = new Set(["admin", "member", "viewer"]);

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const role =
      body && typeof body === "object" && body !== null && "role" in body
        ? String((body as { role?: unknown }).role ?? "")
        : "";

    if (!role || !ROLES.has(role)) {
      return badRequest("Invalid role");
    }

    if (id === session.user.id) {
      return badRequest("Cannot change your own role");
    }

    const user = await db.user.findFirst({
      where: { id, organizationId: session.user.organizationId },
    });
    if (!user) {
      return notFound("User");
    }

    await db.user.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json({ success: true });
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

    const { id } = await params;

    if (id === session.user.id) {
      return badRequest("Cannot remove yourself");
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

    return notFound("User");
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
