import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { getObligationsForTier } from "@/lib/eu-ai-act";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: systemId } = await params;
  const system = await db.aiSystem.findFirst({
    where: { id: systemId, organizationId: session.user.organizationId },
    include: {
      documents: { select: { type: true, status: true, section: true } },
      assessments: { select: { type: true, riskTier: true }, take: 1, orderBy: { createdAt: "desc" } },
      conformityAssessments: {
        select: { status: true, certificateUrl: true },
        take: 1,
        orderBy: { startedAt: "desc" },
      },
      scanResults: { select: { id: true }, take: 1 },
      incidents: { select: { status: true } },
    },
  });

  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const tier = system.riskTier?.toLowerCase() || "unassessed";
  const roleRaw = system.role?.toLowerCase() || "provider";
  const role = roleRaw === "deployer" ? "deployer" : "provider";
  const obligations = getObligationsForTier(tier, role);

  const docTypes = system.documents.map((d) => d.type);
  const docStatuses = system.documents.reduce<Record<string, string>>((acc, d) => {
    acc[d.type] = d.status;
    return acc;
  }, {});

  const obligationStatus = obligations.map((ob) => {
    let status: "met" | "partial" | "not_started" | "not_applicable" = "not_started";
    const evidence: string[] = [];

    switch (ob.id) {
      case "rm-system":
        if (docStatuses["risk_management"] === "approved") {
          status = "met";
          evidence.push("Risk management document approved");
        } else if (docTypes.includes("risk_management")) {
          status = "partial";
          evidence.push("Risk management document exists");
        }
        break;
      case "data-governance":
        if (docStatuses["data_governance"] === "approved") {
          status = "met";
          evidence.push("Data governance document approved");
        } else if (docTypes.includes("data_governance")) {
          status = "partial";
          evidence.push("Data governance document exists");
        }
        break;
      case "tech-doc": {
        const annexDocs = system.documents.filter(
          (d) => d.type === "annex_iv" || d.type === "compliance_item"
        );
        if (annexDocs.length >= 10) {
          status = "met";
          evidence.push(`${annexDocs.length} Annex IV sections documented`);
        } else if (annexDocs.length > 0) {
          status = "partial";
          evidence.push(`${annexDocs.length} Annex IV sections started`);
        }
        break;
      }
      case "human-oversight":
        if (docStatuses["human_oversight"] === "approved") {
          status = "met";
          evidence.push("Human oversight document approved");
        } else if (docTypes.includes("human_oversight")) {
          status = "partial";
        }
        break;
      case "record-keeping":
        if (docStatuses["record_keeping"] === "approved" || docStatuses["logging"] === "approved") {
          status = "met";
          evidence.push("Record-keeping / logging documentation approved");
        } else if (docTypes.includes("record_keeping") || docTypes.includes("logging")) {
          status = "partial";
          evidence.push("Logging documentation in progress");
        }
        break;
      case "transparency-hr":
      case "transparency-limited":
        if (docStatuses["transparency"] === "approved") {
          status = "met";
          evidence.push("Transparency documentation approved");
        } else if (docTypes.includes("transparency")) {
          status = "partial";
        }
        break;
      case "conformity": {
        const ca = system.conformityAssessments[0];
        const caSt = (ca?.status ?? "").toLowerCase();
        if (
          ca &&
          (caSt === "completed" || caSt === "passed" || !!ca.certificateUrl)
        ) {
          status = "met";
          evidence.push("Conformity assessment completed");
        } else if (ca) {
          status = "partial";
          evidence.push("Conformity assessment in progress");
        }
        break;
      }
      case "registration":
        if (docStatuses["eu_registration"] === "approved") {
          status = "met";
          evidence.push("EU database registration documented");
        } else if (docTypes.includes("eu_registration")) {
          status = "partial";
        }
        break;
      case "pms":
        if (docStatuses["post_market"] === "approved") {
          status = "met";
          evidence.push("Post-market monitoring plan approved");
        } else if (docTypes.includes("post_market")) {
          status = "partial";
        }
        break;
      case "incidents":
        status = "partial";
        evidence.push("Incident tracking enabled");
        break;
      case "fria": {
        const friaDocs = system.documents.filter((d) => d.type === "fria");
        if (friaDocs.filter((d) => d.status === "approved").length >= 5) {
          status = "met";
          evidence.push("All FRIA sections completed");
        } else if (friaDocs.length > 0) {
          status = "partial";
          evidence.push(`${friaDocs.length}/5 FRIA sections started`);
        }
        break;
      }
      case "accuracy":
        if (docStatuses["accuracy_robustness"] === "approved") {
          status = "met";
          evidence.push("Accuracy & robustness documentation approved");
        } else if (docTypes.includes("accuracy_robustness")) {
          status = "partial";
        } else if (system.scanResults.length > 0) {
          status = "partial";
          evidence.push("Repository scan completed");
        }
        break;
      case "qms":
        if (docStatuses["quality_management"] === "approved") {
          status = "met";
          evidence.push("QMS document approved");
        } else if (docTypes.includes("quality_management")) {
          status = "partial";
        }
        break;
      default:
        if (system.assessments.length > 0) {
          status = "partial";
          evidence.push("Risk classification completed");
        }
        break;
    }

    return {
      ...ob,
      status,
      evidence,
    };
  });

  const met = obligationStatus.filter((o) => o.status === "met").length;
  const total = obligationStatus.length;

  return NextResponse.json({
    systemId,
    systemName: system.name,
    riskTier: tier,
    role,
    obligations: obligationStatus,
    summary: {
      total,
      met,
      partial: obligationStatus.filter((o) => o.status === "partial").length,
      notStarted: obligationStatus.filter((o) => o.status === "not_started").length,
      compliancePercentage: total > 0 ? Math.round((met / total) * 100) : 0,
    },
  });
}
