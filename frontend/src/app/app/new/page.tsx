"use client";

import { ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/components/app/shell";
import { RunProgress } from "@/components/run/progress";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { loadPaystack } from "@/lib/paystack";

const DRAFT_KEY = "ada.intake-draft";

function NewRun() {
  const { email } = useAuth();
  const params = useSearchParams();
  const [role, setRole] = useState("");
  const [cv, setCv] = useState("");
  const [provider, setProvider] = useState<"paystack" | "stripe">("paystack");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState<string | null>(null);

  // Voice intake hands its extracted role/CV over via a local draft.
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const draft = JSON.parse(raw) as { target_role?: string; cv_text?: string };
        if (draft.target_role) setRole(draft.target_role);
        if (draft.cv_text) setCv(draft.cv_text);
      } catch {
        /* corrupt draft — ignore */
      }
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const run = await api.createRun({
        email,
        target_role: role,
        cv_text: cv,
        provider,
      });
      if (run.provider === "stripe" && run.checkout_url) {
        window.location.href = run.checkout_url;
        return;
      }
      const paystack = await loadPaystack();
      paystack
        .setup({
          key: run.public_key ?? "",
          email,
          amount: run.amount ?? 0,
          currency: run.currency ?? "NGN",
          ref: run.reference,
          onClose: () => setBusy(false),
          callback: () => setRunId(run.run_id),
        })
        .openIframe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the run.");
      setBusy(false);
    }
  };

  if (runId) {
    return (
      <>
        <h1 className="display mb-6 text-3xl">Payment received.</h1>
        <RunProgress runId={runId} />
      </>
    );
  }

  return (
    <>
      <h1 className="display mb-2 text-3xl">Start a run.</h1>
      <p className="mb-8 text-sm text-muted">
        One payment. Ada rewrites your CV for the role, finds your best-fit jobs, and
        preps your interview — autonomously, in minutes.
      </p>
      {params.get("canceled") && (
        <p className="mb-4 text-sm text-muted">Checkout was cancelled — no charge.</p>
      )}
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div>
            <Label htmlFor="role">Target role</Label>
            <Input
              id="role"
              required
              minLength={2}
              placeholder="Senior Backend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cv">Your current CV</Label>
            <Textarea
              id="cv"
              required
              minLength={30}
              rows={12}
              placeholder="Paste your CV — rough is fine, Ada does the polishing."
              value={cv}
              onChange={(e) => setCv(e.target.value)}
            />
          </div>
          <div>
            <Label>Pay with</Label>
            <div className="flex gap-2">
              {(
                [
                  ["paystack", "Paystack · ₦ (Nigeria)"],
                  ["stripe", "Card · $ (Global)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProvider(value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    provider === value
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-line text-muted hover:border-ink/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={busy} className="w-full">
            Run Ada <ArrowRight className="size-4" />
          </Button>
          <p className="text-center text-xs text-muted">
            Payment unlocks the run. Failed runs are never charged.
          </p>
        </form>
      </Card>
    </>
  );
}

export default function NewRunPage() {
  return (
    <Suspense>
      <NewRun />
    </Suspense>
  );
}
