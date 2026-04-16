import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { classifyAiSystem } from "@/lib/ai-provider";
import { calculateComplianceScore } from "@/lib/compliance-scoring";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
  });

  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  try {
    const result = await classifyAiSystem({
      name: system.name,
      description: system.description,
      sector: system.sector,
      useCase: system.useCase,
      provider: system.provider,
      dataInputs: system.dataInputs,
      decisionImpact: system.decisionImpact,
      endUsers: system.endUsers,
      deploymentRegion: system.deploymentRegion,
    });

    // Create assessment record
    const assessment = await db.assessment.create({
      data: {
        aiSystemId: systemId,
        assessorId: session.user.id,
        type: "ai_classification",
        riskTier: result.riskTier,
        confidence: result.confidence,
        justification: result.justification,
        keyArticles: JSON.stringify(result.keyArticles),
        requirements: JSON.stringify(result.requirements),
        recommendations: JSON.stringify(result.recommendations),
        annexIiiCategory: result.annexIiiCategory,
        complianceGaps: JSON.stringify(result.complianceGaps),
      },
    });

    // Update system risk tier
    await db.aiSystem.update({
      where: { id: systemId },
      data: {
        riskTier: result.riskTier,
        complianceStatus: "in_progress",
      },
    });

    await calculateComplianceScore(systemId);

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        aiSystemId: systemId,
        action: "classify",
        resource: "ai_system",
        resourceId: systemId,
        details: JSON.stringify({ riskTier: result.riskTier, confidence: result.confidence }),
      },
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        riskTier: result.riskTier,
        confidence: result.confidence,
        justification: result.justification,
        keyArticles: result.keyArticles,
        requirements: result.requirements,
        recommendations: result.recommendations,
        complianceGaps: result.complianceGaps,
      },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json(
      { error: "Classification failed. Please try again." },
      { status: 500 }
    );
  }
}
