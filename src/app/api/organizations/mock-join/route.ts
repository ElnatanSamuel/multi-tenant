import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ organizations: [] });
  }

  const user = (session as any).user ?? session;
  const userId = user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ organizations: [] });
  }

  // For this mock flow, show all organizations the current user does NOT own.
  // We treat an "owner" membership as equivalent to having created the org.
  const result = await db.query(
    `SELECT "organization"."id", "organization"."name"
     FROM "organization"
     WHERE "organization"."id" NOT IN (
       SELECT "organizationId"
       FROM "member"
       WHERE "userId" = $1 AND ("role" = 'owner' OR "role" = 'OWNER')
     )
     ORDER BY "organization"."createdAt" ASC`,
    [userId]
  );

  const organizations = result.rows.map((row: any) => ({
    id: row.id as string,
    name: (row.name as string) ?? "Organization",
    mockInvitationId: `mock-${row.id as string}`,
  }));

  return NextResponse.json({ organizations });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const user = (session as any).user ?? session;
  const userId = user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      organizationId?: string;
    } | null;

    const organizationId = body?.organizationId?.toString().trim();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Ensure the organization exists.
    const orgResult = await db.query(
      `SELECT "id" FROM "organization" WHERE "id" = $1 LIMIT 1`,
      [organizationId]
    );

    if (!orgResult.rows[0]) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // If the user is already a member, do nothing.
    const memberResult = await db.query(
      `SELECT 1
       FROM "member"
       WHERE "organizationId" = $1 AND "userId" = $2
       LIMIT 1`,
      [organizationId, userId]
    );

    if (memberResult.rows[0]) {
      return NextResponse.json({ joined: false, alreadyMember: true });
    }

    await db.query(
      `INSERT INTO "member" ("id", "organizationId", "userId", "role", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, 'member', NOW())`,
      [organizationId, userId]
    );

    return NextResponse.json({ joined: true });
  } catch (error: any) {
    const message =
      (error && (error.message || String(error))) ||
      "Unknown error while joining organization";
    return NextResponse.json(
      { error: `Mock join failed: ${message}` },
      { status: 500 }
    );
  }
}
