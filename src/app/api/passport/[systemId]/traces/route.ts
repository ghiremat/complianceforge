import { NextResponse } from "next/server";
import { db } from "@/server/db";

function corsAll(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

type RouteParams = { params: Promise<{ systemId: string }> };

export async function OPTIONS() {
  return corsAll(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request, { params }: RouteParams) {
  const { systemId } = await params;

  const config = await db.passportConfig.findUnique({
    where: { aiSystemId: systemId },
    select: { enabled: true, aiSystem: { select: { organizationId: true } } },
  });

  if (!config?.enabled) {
    return corsAll(
      NextResponse.json({ error: "Not found" }, { status: 404 })
    );
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "5";

  const auditUrl = process.env.INFERENCE_AUDIT_URL;
  if (!auditUrl) {
    return corsAll(
      NextResponse.json({ traces: [], total: 0 }, { status: 200 })
    );
  }

  try {
    const res = await fetch(
      `${auditUrl}/traces/${systemId}?limit=${limit}`,
      {
        headers: {
          "X-Internal-Secret": process.env.INTERNAL_API_SECRET ?? "",
          "X-Tenant-Id": config.aiSystem.organizationId,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      return corsAll(
        NextResponse.json({ traces: [], total: 0 }, { status: 200 })
      );
    }

    const data = await res.json();
    return corsAll(NextResponse.json(data));
  } catch {
    return corsAll(
      NextResponse.json({ traces: [], total: 0 }, { status: 200 })
    );
  }
}
