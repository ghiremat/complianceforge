import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { randomBytes } from "node:crypto";

const INVITE_ROLES = new Set(["admin", "member", "viewer"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = (await request.json()) as { email: string; role?: string };

  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const role = body.role && INVITE_ROLES.has(body.role) ? body.role : "member";

  const existingUser = await db.user.findFirst({
    where: { email, organizationId: session.user.organizationId },
  });
  if (existingUser) {
    return NextResponse.json({ error: "User already in organization" }, { status: 409 });
  }

  const existingInvite = await db.invitation.findFirst({
    where: {
      email,
      organizationId: session.user.organizationId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    return NextResponse.json({ error: "Invitation already pending" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      email,
      role,
      token,
      expiresAt,
      organizationId: session.user.organizationId,
      invitedById: session.user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      action: "invite",
      resource: "user",
      resourceId: invitation.id,
      details: JSON.stringify({ email, role }),
    },
  });

  return NextResponse.json(
    { id: invitation.id, email, role: invitation.role, expiresAt, token: invitation.token },
    { status: 201 }
  );
}
