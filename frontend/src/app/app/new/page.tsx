"use client";

import { ArrowRight, Check } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useAuth } from "@/components/app/shell";
import { RunProgress } from "@/components/run/progress";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { api } from "@/lib/api";
import { loadPaystack } from "@/lib/paystack";

const DRAFT_KEY = "ada.intake-draft";

const PROVIDERS = [
  {
    value: "paystack",
    name: "Paystack",
    price: "₦2,000",
    detail: "Nigeria · cards, transfer, USSD",
  },
  {
    value: "stripe",
    name: "Card via Stripe",
    price: "$15",
    detail: "Everywhere else · all major cards",
  },
] as const;

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
      <PageHeader
        title="Start a run."
        subtitle="One payment. Ada rewrites your CV for the role, finds your best-fit jobs, and preps your interview — autonomously, in minutes."
      />
      {params.get("canceled") && (
        <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Checkout was cancelled — no charge.
        </p>
      )}
      <Card className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-6">
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
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PROVIDERS.map((p) => {
                const selected = provider === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    aria-pressed={selected}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent-soft shadow-card"
                        : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span
                      className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors ${
                        selected
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line text-transparent"
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                    <p className={`text-sm font-medium ${selected ? "text-accent" : ""}`}>
                      {p.name}
                    </p>
                    <p className="display mt-1 text-2xl">{p.price}</p>
                    <p className="mt-1 text-xs text-muted">{p.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" loading={busy} className="group w-full !py-3.5">
            Run Ada
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
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
