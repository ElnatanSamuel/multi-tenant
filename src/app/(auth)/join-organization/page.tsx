"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MockOrg = {
  id: string;
  name: string;
  mockInvitationId: string;
};

export default function JoinOrganizationPage() {
  const router = useRouter();
  const [invitationId, setInvitationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockOrgs, setMockOrgs] = useState<MockOrg[]>([]);
  const [mockLoading, setMockLoading] = useState(false);

  useEffect(() => {
    async function loadMockOrgs() {
      setMockLoading(true);
      try {
        const response = await fetch("/api/organizations/mock-join");
        if (!response.ok) return;
        const data = (await response.json()) as {
          organizations?: MockOrg[];
        };
        if (Array.isArray(data.organizations)) {
          setMockOrgs(data.organizations);
        }
      } finally {
        setMockLoading(false);
      }
    }

    loadMockOrgs();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmedInvitation = invitationId.trim();
      const trimmedOrgId = organizationId.trim();

      // Real invitation flow: use Better Auth to accept an invitation ID.
      if (trimmedInvitation && !trimmedInvitation.startsWith("mock-")) {
        const { error } = await authClient.organization.acceptInvitation({
          invitationId: trimmedInvitation,
        });

        if (error) {
          setError(error.message ?? "Unable to join organization.");
          return;
        }

        router.push("/");
        return;
      }

      // Mock flow: join by organization ID only. This does not use a
      // real invitation; instead, it inserts the current user as a
      // member of the chosen organization and then sets it active.
      if (trimmedOrgId) {
        const response = await fetch("/api/organizations/mock-join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ organizationId: trimmedOrgId }),
        });

        if (!response.ok) {
          let message = "Unable to join organization.";
          try {
            const data = (await response.json()) as { error?: string };
            if (data?.error) {
              message = data.error;
            }
          } catch {
            try {
              const text = await response.text();
              if (text) {
                message = text;
              }
            } catch {}
          }
          setError(message);
          return;
        }

        try {
          await authClient.organization.setActive({
            organizationId: trimmedOrgId,
          });
        } catch {
          // Even if this fails, the URL param will still drive selection.
        }

        router.push(`/?orgId=${trimmedOrgId}`);
        return;
      }

      setError("Enter an invitation ID or choose an organization to join.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Join an organization</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="invitationId">Invitation ID</Label>
                <Input
                  id="invitationId"
                  value={invitationId}
                  onChange={(event) => setInvitationId(event.target.value)}
                  placeholder="Real invitation ID (optional)"
                />
                <p className="text-xs text-muted-foreground">
                  Use a real invitation ID to actually join.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName">Organization name (mock)</Label>
                <Input
                  id="orgName"
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="e.g. Acme Inc"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgId">Organization ID (mock join)</Label>
                <Input
                  id="orgId"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  placeholder="Paste or pick an org ID from the list below"
                />
                <p className="text-xs text-muted-foreground">
                  For this assignment, joining by organization ID simply sets
                  your active organization and redirects you into that
                  workspace.
                </p>
              </div>

              {mockLoading && (
                <p className="text-xs text-muted-foreground">
                  Loading your organizations…
                </p>
              )}

              {!mockLoading && mockOrgs.length > 0 && (
                <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
                  <p className="font-medium">Mock invitations for your orgs</p>
                  <p className="text-muted-foreground">
                    These are mock IDs you can use to quickly test joining by
                    organization. Choosing one fills in the fields above.
                  </p>
                  <div className="mt-2 space-y-1">
                    {mockOrgs.map((org) => (
                      <div
                        key={org.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-medium">
                            {org.name}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            ID: {org.id}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            Mock invitation: {org.mockInvitationId}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          className="shrink-0 px-2 text-[10px]"
                          onClick={() => {
                            setOrganizationName(org.name);
                            setOrganizationId(org.id);
                            setInvitationId(org.mockInvitationId);
                          }}
                        >
                          Use
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining..." : "Join organization"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
