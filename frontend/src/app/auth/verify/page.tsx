"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Spinner } from "@/components/ui";

/** Hands the emailed token to the backend via the same-origin proxy, so the
 *  session cookie is set first-party; the backend then redirects into /app. */
function Verify() {
  const params = useSearchParams();
  useEffect(() => {
    const token = params.get("token");
    window.location.replace(
      token ? `/api/auth/verify?token=${encodeURIComponent(token)}` : "/login",
    );
  }, [params]);
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Spinner label="Signing you in..." />
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
