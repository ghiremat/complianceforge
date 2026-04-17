import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const started = Date.now();
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;

    return NextResponse.json({
      status: "ok",
      timestamp,
      checks: {
        database: {
          status: "ok" as const,
          latencyMs,
        },
      },
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        checks: {
          database: {
            status: "error" as const,
            latencyMs: 0,
          },
        },
      },
      { status: 503 }
    );
  }
}
