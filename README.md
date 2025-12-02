## Multi Tenant App

Next.js app for managing **organizations**, **outlines**, and **team members** using **Better Auth** + Postgres.

- Multiple organizations per user
- Org switcher in the left sidebar (Dashboard + Team)
- Team Info page with members list, roles, invite by email, and owner-only remove
- Join Organization page with real invitation IDs + mock join by org ID
- Outlines table per org with add/edit/delete sections

---

## 1. Requirements

- Node 20+
- Postgres 16+ running locally
- `DATABASE_URL` pointing at your DB

Example local DB (already used in this project):

```bash
postgres://user@localhost:5432/multitenant_workspace
```

Make sure that database exists:

```bash
createdb multitenant_workspace
```

---

## 2. Configure environment

In `web/.env` set:

```bash
DATABASE_URL=postgres://user@localhost:5432/multitenant_workspace
BETTER_AUTH_SECRET=some-long-random-string
```

`BETTER_AUTH_SECRET` can be any long random value in dev.

---

## 3. Run migrations

From the `web` directory:

```bash
cd web

# Run Better Auth migrations (creates user/session/org/member/invitation tables)
npx @better-auth/cli@latest migrate

# If you ever fully wipe the schema:
#   psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
#   then re-run the migrate command.

# Create the outlines table (only needed if missing)
psql "$DATABASE_URL" <<'SQL'
CREATE TABLE IF NOT EXISTS outlines (
  id              SERIAL PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  header          TEXT NOT NULL,
  section_type    TEXT NOT NULL,
  status          TEXT NOT NULL,
  target          INTEGER NOT NULL DEFAULT 0,
  limit_value     INTEGER NOT NULL DEFAULT 0,
  reviewer        TEXT NOT NULL DEFAULT 'ASSIM'
);
SQL
```

---

## 4. Start the dev server

From `web/`:

```bash
npm install        # or pnpm/yarn
npm run dev
```

Then open:

- Dashboard: `http://localhost:3000/`
- Team Info: `http://localhost:3000/team`
- Join Org: `http://localhost:3000/join-organization`

---

## 5. Feature

### Organizations & switching

- Create an org from `/create-organization`.
- Switch orgs from the top-left dropdown in the sidebar.
- Org context is driven by `?orgId=...` in the URL and kept in sync between:
  - Dashboard: `/?orgId=<org-id>`
  - Team Info: `/team?orgId=<org-id>`

### Outlines (Table dashboard)

- Per-org outlines table (sections) on the main dashboard.
- Add/edit/delete sections via the right-hand sheet.
- Data stored in the `outlines` table keyed by `organization_id`.

### Team Info / members

- `/team?orgId=<org-id>` shows:
  - Organization name + member count
  - Members with Name, Email, Role (Owner/Member)
- **Owner-only actions:**
  - Invite by email (always creates `member` role invites)
  - Remove members
- Removal deletes from the `member` table and the removed user can no longer access that org’s Team page.

### Join Organization

- `/join-organization` supports:
  - Real invitation IDs via `authClient.organization.acceptInvitation`
  - Mock join by organization ID for local testing via `/api/organizations/mock-join`
- After joining, the app sets the active org and redirects you into the workspace.

---

## 6. Useful commands

Reset the local DB schema (dev-only):

```bash
psql "$DATABASE_URL" <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL

cd web
npx @better-auth/cli@latest migrate
```

Re-run only outlines migration if needed:

```bash
psql "$DATABASE_URL" -c 'TRUNCATE TABLE outlines RESTART IDENTITY CASCADE;'
```

This should be enough to get the whole stack running locally and understand what’s wired up.
