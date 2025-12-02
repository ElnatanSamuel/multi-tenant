"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);

    try {
      await authClient.signOut();
    } catch {
      // ignore, we'll still push to sign-in
    } finally {
      setLoading(false);
      router.push("/sign-in");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "Signing out..." : "Log out"}
    </Button>
  );
}
