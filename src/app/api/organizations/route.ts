import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/server/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json([], { status: 200 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: { id: true, name: true, slug: true, plan: true },
  });

  return NextResponse.json(org ? [org] : []);
}
