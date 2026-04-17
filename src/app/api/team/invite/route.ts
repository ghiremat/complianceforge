import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  badRequest,
  conflict,
  forbidden,
  serverError,
  unauthorized,
  validationError,
} from "@/lib/api-errors";
import { db } from "@/server/db";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).optional().default("member"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return unauthorized();
    }
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const role = parsed.data.role;

    const existingUser = await db.user.findFirst({
      where: { email, organizationId: session.user.organizationId },
    });
    if (existingUser) {
      return conflict("User already in organization");
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
      return conflict("Invitation already pending");
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
  } catch (e) {
    console.error(e);
    return serverError();
  }
}
