"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button, Card, Input, Label, Logo } from "@/components/ui";
import { api } from "@/lib/api";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.get("error") === "invalid_link"
      ? "That link is invalid or expired — request a fresh one."
      : "",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.requestLink(email);
      setSent(true);
    } catch {
      setError("Couldn't send the link — try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="glow-field relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      <div className="dot-grid absolute inset-0 -z-10" aria-hidden />
      <Link href="/" className="mb-10">
        <Logo className="text-3xl" />
      </Link>
      <Card className="w-full max-w-sm p-8 shadow-lift">
        {sent ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
              <MailCheck className="size-6 text-accent" />
            </span>
            <h1 className="display text-2xl">Check your inbox</h1>
            <p className="text-sm leading-relaxed text-muted">
              A one-time sign-in link is on its way to <strong>{email}</strong>. It
              expires in 15 minutes.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-1 text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="display text-2xl">Sign in to Ada</h1>
              <p className="mt-1 text-sm text-muted">
                No passwords. We email you a one-time link.
              </p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" loading={busy} className="group w-full">
              Email me a link
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>
        )}
      </Card>
      <p className="mt-6 text-xs text-muted">New here? The same link signs you up.</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
