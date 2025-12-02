"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import LogoutButton from "@/components/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roleOptions = [
  { value: "OWNER", label: "Owner" },
  { value: "MEMBER", label: "Member" },
] as const;

type Role = (typeof roleOptions)[number]["value"];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type MemberApiRow = {
  id?: string;
  email?: string | null;
  role?: string | null;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
};

type TeamShellProps = {
  userName: string | null;
  userEmail: string | null;
  orgId: string;
  organizationName: string;
  currentUserRole: string | null;
  organizations: { id: string; name: string }[];
};

export default function TeamShell({
  userName,
  userEmail,
  orgId,
  organizationName,
  currentUserRole,
  organizations,
}: TeamShellProps) {
  const router = useRouter();
  const [activeOrgId, setActiveOrgId] = useState(orgId);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [inviteLoading, setInviteLoading] = useState(false);

  const initials = useMemo(() => {
    const source = userName || userEmail || "";
    if (!source) return "U";
    const parts = source
      .split(/[ .@]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return "U";
    const first = parts[0]?.[0] ?? "U";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }, [userName, userEmail]);

  function normalizeMembers(apiMembers: MemberApiRow[]): TeamMember[] {
    return apiMembers.map((member, index) => {
      const user = member.user ?? {};
      const email = (user.email ?? member.email ?? "")?.toString() ?? "";
      const nameFromEmail = email ? email.split("@")[0] : "";
      const name = ((user.name as string | null) ?? nameFromEmail) || "Member";
      const roleValue = (member.role ?? "").toString().toUpperCase();
      const role: Role = roleValue === "OWNER" ? "OWNER" : "MEMBER";
      const id =
        (member.id as string | undefined) ?? email ?? String(index + 1);

      return {
        id,
        name,
        email,
        role,
      };
    });
  }

  async function reloadMembers() {
    const response = await fetch(`/api/organizations/${activeOrgId}/members`);

    if (!response.ok) {
      setMembers([]);
      return;
    }

    const data = (await response.json()) as { members: MemberApiRow[] };
    setMembers(normalizeMembers(data.members));
  }

  useEffect(() => {
    // Clear members when switching organizations so we don't show
    // stale rows from the previous org while the new data loads.
    setMembers([]);
    reloadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  useEffect(() => {
    setActiveOrgId(orgId);
  }, [orgId]);

  const activeOrgName = useMemo(() => {
    const found = organizations.find((org) => org.id === activeOrgId);
    return found?.name ?? organizationName;
  }, [organizations, activeOrgId, organizationName]);

  const isOwner = useMemo(() => {
    const role = (currentUserRole ?? "").toString().toUpperCase();
    return role === "OWNER";
  }, [currentUserRole]);

  async function handleInvite() {
    if (!email.trim() || inviteLoading) return;

    setInviteLoading(true);

    try {
      // For this assignment, all invitations create members with the
      // "member" role. We don't allow choosing owner via the UI.
      const response = await fetch(
        `/api/organizations/${activeOrgId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, role: "member" }),
        }
      );

      if (!response.ok) {
        return;
      }

      setEmail("");
      setRole("MEMBER");
      await reloadMembers();
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    const response = await fetch(
      `/api/organizations/${activeOrgId}/members/remove`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ memberIdOrEmail: member.id }),
      }
    );

    if (!response.ok) {
      return;
    }

    await reloadMembers();
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-r bg-sidebar">
        <div className="px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                  AI
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold leading-tight">
                    {activeOrgName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Workspace
                  </span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={async () => {
                    if (!org.id || org.id === activeOrgId) return;
                    setActiveOrgId(org.id);
                    try {
                      await authClient.organization.setActive({
                        organizationId: org.id,
                      });
                    } catch {
                      // ignore client errors; URL param will still drive selection
                    }
                    router.push(`/team?orgId=${org.id}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                    {org.name?.charAt(0)?.toUpperCase() ?? "O"}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="truncate text-sm">{org.name}</span>
                  </div>
                  {org.id === activeOrgId && (
                    <span className="text-[10px] text-muted-foreground">
                      Active
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/create-organization"
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border text-xs">
                    +
                  </div>
                  <span className="text-sm">Add organization</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/join-organization"
                  className="flex items-center gap-2"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border text-xs">
                    ↳
                  </div>
                  <span className="text-sm">Join organization</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Platform
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          <Link
            href={`/?orgId=${activeOrgId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="text-xs">▢</span>
            <span>Table</span>
          </Link>
          <Link
            href={`/team?orgId=${activeOrgId}`}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <span className="text-xs">☰</span>
            <span>Team Info / Setup</span>
          </Link>
        </nav>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <h1 className="text-sm font-semibold leading-tight">
              Team Info / Setup
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage who has access to this workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button className="text-xs" disabled={!isOwner}>
              Invite member
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <LogoutButton />
          </div>
        </header>

        <section className="flex-1 space-y-4 p-6">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-4 grid gap-3 border-b pb-4 text-sm sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="email">Invite by email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={!isOwner}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as Role)}
                  disabled
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end sm:justify-start">
                <Button
                  type="button"
                  className="mt-6 w-full text-xs sm:w-auto"
                  onClick={handleInvite}
                  disabled={!isOwner || inviteLoading}
                >
                  {inviteLoading ? "Sending..." : "Send invite"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 pb-2 text-xs text-muted-foreground">
              <span>
                Organization:{" "}
                <span className="font-medium text-foreground">
                  {organizationName}
                </span>
              </span>
              <span>{members.length} members</span>
            </div>

            <div className="rounded-lg border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="w-12">
                        <Avatar className="h-7 w-7 text-xs">
                          <AvatarFallback>
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {member.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            member.role === "OWNER" ? "secondary" : "outline"
                          }
                        >
                          {
                            roleOptions.find((r) => r.value === member.role)
                              ?.label
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.role === "OWNER" ? (
                          <span className="text-xs text-muted-foreground">
                            Owner
                          </span>
                        ) : isOwner ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-7 px-3 text-xs"
                            onClick={() => handleRemove(member)}
                          >
                            Remove
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Member
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {members.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No team members yet. Use the form above to invite
                        someone.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
