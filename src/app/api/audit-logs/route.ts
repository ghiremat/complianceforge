import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        user: { select: { name: true, email: true } },
        aiSystem: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({
      where: { organizationId: session.user.organizationId },
    }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      userName: l.user?.name || l.user?.email || "System",
      systemName: l.aiSystem?.name || null,
      details: l.details,
      ipAddress: null,
      timestamp: l.createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
}
