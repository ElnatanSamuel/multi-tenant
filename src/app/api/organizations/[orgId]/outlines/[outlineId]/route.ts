import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireOrgMember } from "../../members/route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; outlineId: string }> }
) {
  const { orgId, outlineId } = await params;

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

  if (!body) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (body.header !== undefined) {
    fields.push("header = $");
    values.push(body.header);
  }

  if (body.sectionType !== undefined) {
    fields.push("section_type = $");
    values.push(body.sectionType);
  }

  if (body.status !== undefined) {
    fields.push("status = $");
    values.push(body.status);
  }

  if (body.target !== undefined) {
    fields.push("target = $");
    values.push(body.target);
  }

  if (body.limit !== undefined) {
    fields.push("limit_value = $");
    values.push(body.limit);
  }

  if (body.reviewer !== undefined) {
    fields.push("reviewer = $");
    values.push(body.reviewer);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const setClause = fields
    .map((fragment, index) => `${fragment}${index + 1}`)
    .join(", ");

  values.push(orgId, Number(outlineId));

  const result = await db.query(
    `UPDATE outlines
     SET ${setClause}
     WHERE organization_id = $${fields.length + 1}
       AND id = $${fields.length + 2}
     RETURNING id, organization_id, header, section_type, status, target, limit_value AS "limit", reviewer`,
    values
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ outline: result.rows[0] });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; outlineId: string }> }
) {
  const { orgId, outlineId } = await params;

  const { error } = await requireOrgMember(orgId);
  if (error) return error;

  if (!db) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  const result = await db.query(
    `DELETE FROM outlines
     WHERE organization_id = $1 AND id = $2`,
    [orgId, Number(outlineId)]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
