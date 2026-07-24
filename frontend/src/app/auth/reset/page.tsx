"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ApiError, api } from "@/lib/api";
import { Button, Card, Input, Label, Logo } from "@/components/ui";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(token, password);
      // Reset revokes existing sessions, so send them to sign in fresh.
      router.push("/login?reset=done");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong — request a new link.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="glow-field relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="dot-grid absolute inset-0 -z-10" aria-hidden />
      <Link href="/" className="mb-10">
        <Logo className="text-3xl" />
      </Link>

      <Card className="w-full max-w-sm p-8 shadow-lift">
        {!token ? (
          <div className="space-y-3 text-center">
            <h1 className="display text-2xl">Link incomplete</h1>
            <p className="text-sm leading-relaxed text-muted">
              This reset link is missing its token. Request a fresh one from the sign-in
              page.
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="display text-2xl">Set a new password</h1>
              <p className="mt-1 text-sm text-muted">
                Choose a new password for your account.
              </p>
            </div>
            <div>
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  autoFocus
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition-colors hover:text-ink"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={busy} className="group w-full">
              Update password
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
