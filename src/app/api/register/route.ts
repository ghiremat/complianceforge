import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/server/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, orgName } = body as {
      email?: string;
      password?: string;
      name?: string;
      orgName?: string;
    };

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    const slug = (orgName || name || normalizedEmail.split("@")[0])
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48);

    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const org = await db.organization.create({
      data: {
        name: orgName || `${name || normalizedEmail.split("@")[0]}'s Org`,
        slug: uniqueSlug,
        plan: "free",
        maxSystems: 3,
      },
    });

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        hashedPassword,
        role: "admin",
        organizationId: org.id,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, organizationId: org.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
