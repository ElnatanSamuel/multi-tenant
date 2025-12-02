import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      session: null as any,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null as any };
}

export async function requireOrgMember(orgId: string) {
  const { session, error } = await requireSession();
  if (!session) return { session: null as any, member: null as any, error };

  if (!db) {
    return {
      session,
      member: null,
      error: NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      ),
    };
  }

  const result = await db.query(
    `SELECT role
     FROM member
     WHERE "organizationId" = $1 AND "userId" = $2
     LIMIT 1`,
    [orgId, session.user.id]
  );

  const row = result.rows[0] as { role?: string } | undefined;

  if (!row) {
    return {
      session,
      member: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const member = { role: row.role } as any;

  return { session, member, error: null as any };
}

export async function requireOrgOwner(orgId: string) {
  const { session, member, error } = await requireOrgMember(orgId);
  if (error) return { session, member, error };

  const role = (member as any)?.role;
  if (role !== "owner" && role !== "OWNER") {
    return {
      session,
      member,
      error: NextResponse.json(
        { error: "Only owners can manage members" },
        { status: 403 }
      ),
    };
  }

  return { session, member, error: null as any };
}

export async function GET(
  _request: Request,
  { params }: { params: { orgId: string } }
) {
  const { session, error } = await requireSession();
  if (!session) return error;

  const result: any = await auth.api.listMembers({
    headers: await headers(),
    query: {
      organizationId: params.orgId,
      limit: 100,
    },
  });

  const members = result?.members ?? result?.data?.members ?? [];

  return NextResponse.json({ members });
}

export async function POST(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const { error } = await requireOrgOwner(params.orgId);
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: "member" | "admin" | "owner" | ("member" | "admin" | "owner")[];
  } | null;

  if (!body?.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const role = body.role ?? "member";

  const result = await auth.api.createInvitation({
    headers: await headers(),
    body: {
      email: body.email,
      role,
      organizationId: params.orgId,
    },
  });

  return NextResponse.json(result);
}
