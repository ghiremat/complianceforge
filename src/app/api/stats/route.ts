import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({}, { status: 200 });
  }

  const orgId = session.user.organizationId;

  const systems = await db.aiSystem.findMany({
    where: { organizationId: orgId },
    select: { riskTier: true, complianceScore: true },
  });

  const scans = await db.scanResult.count({
    where: { organizationId: orgId },
  });

  const incidents = await db.incident.count({
    where: { aiSystem: { organizationId: orgId }, status: { not: "resolved" } },
  });

  const totalSystems = systems.length;
  const avgScore =
    totalSystems > 0
      ? Math.round(systems.reduce((sum, s) => sum + s.complianceScore, 0) / totalSystems)
      : 0;
  const highRisk = systems.filter(
    (s) => s.riskTier === "high" || s.riskTier === "unacceptable"
  ).length;

  return NextResponse.json({
    total_systems: totalSystems,
    avg_compliance_score: avgScore,
    high_risk_systems: highRisk,
    total_scans: scans,
    open_incidents: incidents,
  });
}
