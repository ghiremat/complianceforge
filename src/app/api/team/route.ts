import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const isAdmin = session.user.role === "admin";

  const memberWhere = { organizationId: session.user.organizationId };

  const [members, total, invitationsRaw] = await Promise.all([
    db.user.findMany({
      where: memberWhere,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    db.user.count({ where: memberWhere }),
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

  return NextResponse.json({
    members,
    invitations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
