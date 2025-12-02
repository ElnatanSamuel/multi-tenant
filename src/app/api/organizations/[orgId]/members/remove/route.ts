import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const body = (await request.json().catch(() => null)) as {
    memberIdOrEmail?: string;
  } | null;

  if (!body?.memberIdOrEmail) {
    return NextResponse.json(
      { error: "memberIdOrEmail is required" },
      { status: 400 }
    );
  }

  const result = await auth.api.removeMember({
    headers: await headers(),
    body: {
      memberIdOrEmail: body.memberIdOrEmail,
      organizationId: params.orgId,
    },
  });

  return NextResponse.json(result);
}
