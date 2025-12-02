import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import TeamShell from "@/components/team-shell";

type TeamPageProps = {
  searchParams?: { orgId?: string };
};

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in");
  }

  const user = (session as any).user ?? session;
  const userName: string | null = user?.name ?? null;
  const userEmail: string | null = user?.email ?? null;

  const urlOrgId = searchParams?.orgId ?? null;

  // If orgId is present in the URL, that is the single source of truth for
  // which workspace we are looking at. Only fall back to the session or DB
  // when no orgId query param is provided.
  let organizationId: string | null = urlOrgId;

  if (!organizationId) {
    organizationId =
      (session as any).activeOrganizationId ||
      (session as any).data?.activeOrganizationId ||
      null;
  }

  // Fallback: if the session does not yet have an active organization,
  // but the user is a member of at least one org, use the first one.
  if (!organizationId && db && user?.id) {
    try {
      const result = await db.query(
        `SELECT "organization"."id"
         FROM "member"
         JOIN "organization" ON "member"."organizationId" = "organization"."id"
         WHERE "member"."userId" = $1
         ORDER BY "organization"."createdAt" ASC
         LIMIT 1`,
        [user.id]
      );

      if (result.rows[0]?.id) {
        organizationId = result.rows[0].id as string;
      }
    } catch {
      // On any DB error, we fall back to the normal redirect below.
    }
  }

  if (!organizationId) {
    redirect("/create-organization");
  }

  let organizationName = "Organization";
  let organizations: { id: string; name: string }[] = [];
  let currentUserRole: string | null = null;

  if (db && user?.id) {
    try {
      const result = await db.query(
        `SELECT "organization"."id", "organization"."name"
         FROM "member"
         JOIN "organization" ON "member"."organizationId" = "organization"."id"
         WHERE "member"."userId" = $1
         ORDER BY "organization"."createdAt" ASC`,
        [user.id]
      );

      organizations = result.rows.map((row: any) => ({
        id: row.id as string,
        name: (row.name as string) ?? "Organization",
      }));

      const current = organizations.find((org) => org.id === organizationId);

      if (current?.name) {
        organizationName = current.name;
      } else if (organizationId) {
        try {
          const single = await db.query(
            `SELECT "name" FROM "organization" WHERE "id" = $1 LIMIT 1`,
            [organizationId]
          );

          if (single.rows[0]?.name) {
            organizationName = single.rows[0].name as string;
          } else if (result.rows[0]?.name) {
            organizationName = result.rows[0].name as string;
          }
        } catch {
          if (result.rows[0]?.name) {
            organizationName = result.rows[0].name as string;
          }
        }
      } else if (result.rows[0]?.name) {
        organizationName = result.rows[0].name as string;
      }
    } catch {
      // keep defaults on error
    }
  }

  if (db && user?.id && organizationId) {
    try {
      const roleResult = await db.query(
        `SELECT role FROM member WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
        [organizationId, user.id]
      );

      const row = roleResult.rows[0] as { role?: string } | undefined;

      if (!row?.role) {
        // User is not a member of this organization; they should not be able
        // to access the Team page for it.
        redirect("/join-organization");
      }

      currentUserRole = row.role as string;
    } catch {
      // On error, treat as non-member and redirect to join.
      redirect("/join-organization");
    }
  }

  return (
    <TeamShell
      userName={userName}
      userEmail={userEmail}
      orgId={organizationId}
      organizationName={organizationName}
      currentUserRole={currentUserRole}
      organizations={organizations}
    />
  );
}
