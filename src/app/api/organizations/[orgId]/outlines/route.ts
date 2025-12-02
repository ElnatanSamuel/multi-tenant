import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireOrgMember } from "../members/route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const { error } = await requireOrgMember(orgId);
  if (error) return error;

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const result = await db.query(
    `SELECT id, organization_id, header, section_type, status, target, limit_value AS "limit", reviewer
     FROM outlines
     WHERE organization_id = $1
     ORDER BY id ASC`,
    [orgId]
  );

  return NextResponse.json({ outlines: result.rows });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  const { error } = await requireOrgMember(orgId);
  if (error) return error;

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    header?: string;
    sectionType?: string;
    status?: string;
    target?: number;
    limit?: number;
    reviewer?: string;
  } | null;

  if (!body?.header || !body.sectionType || !body.status) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const result = await db.query(
    `INSERT INTO outlines (organization_id, header, section_type, status, target, limit_value, reviewer)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, organization_id, header, section_type, status, target, limit_value AS "limit", reviewer`,
    [
      orgId,
      body.header,
      body.sectionType,
      body.status,
      body.target ?? 0,
      body.limit ?? 0,
      body.reviewer ?? "ASSIM",
    ]
  );

  return NextResponse.json({ outline: result.rows[0] }, { status: 201 });
}
