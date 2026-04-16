import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "admin";

  const [members, invitationsRaw] = await Promise.all([
    db.user.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.invitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: isAdmin
        ? {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
            token: true,
          }
        : {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
          },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const invitations = invitationsRaw;

  return NextResponse.json({ members, invitations });
}
