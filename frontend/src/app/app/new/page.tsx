"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Mic } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/app/shell";
import { RunProgress } from "@/components/run/progress";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { api, type JobsPreview } from "@/lib/api";
import { loadPaystack } from "@/lib/paystack";

/** Guided onboarding: one question per screen — role, CV, a job-market teaser
 *  from a cheap keyword lookup (no scores; that's the paid part), then the
 *  offer. Payment, webhooks, and the run pipeline are untouched. Answers
 *  persist across refresh and Back never loses them. */

const DRAFT_KEY = "ada.intake-draft"; // handed over by the voice call
const SAVE_KEY = "ada.onboarding"; // survives refresh until payment starts

const STEPS = ["role", "cv", "teaser", "pay"] as const;
type Step = (typeof STEPS)[number];

const PROVIDERS = [
  { value: "paystack", name: "Paystack", price: "₦2,000", detail: "Nigeria · cards, transfer, USSD" },
  { value: "stripe", name: "Card via Stripe", price: "$15", detail: "Everywhere else · all major cards" },
] as const;

interface Saved {
  role: string;
  cv: string;
  step: Step;
  fromVoice?: boolean;
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    if (!s.role && !s.cv) return null;
    return {
      role: s.role ?? "",
      cv: s.cv ?? "",
      step: STEPS.includes(s.step as Step) ? (s.step as Step) : "role",
      fromVoice: !!s.fromVoice,
    };
  } catch {
    return null;
  }
}

const roleValid = (v: string) => v.trim().length >= 2 && /[a-zA-Z]{2,}/.test(v);
const cvValid = (v: string) => v.trim().length >= 30;

function StepShell({
  step,
  children,
}: {
  step: Step;
  children: React.ReactNode;
}) {
  const index = STEPS.indexOf(step);
  return (
    <div className="mx-auto max-w-xl">
      {/* Slim progress: the flow is short, and says so */}
      <div className="mb-10">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="eyebrow">
            Step {index + 1} of {STEPS.length}
          </p>
          <p className="text-xs text-muted">
            {step === "pay" ? "Last one" : "Takes about a minute"}
          </p>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-500 ease-out"
            style={{ width: `${((index + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function NewRun() {
  const { email } = useAuth();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState("");
  const [cv, setCv] = useState("");
  const [fromVoice, setFromVoice] = useState(false);
  const [provider, setProvider] = useState<"paystack" | "stripe">("paystack");
  const [preview, setPreview] = useState<JobsPreview | null | "loading" | "error">(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    params.get("canceled") ? "Checkout was cancelled — no charge. Everything's still here." : "",
  );
  const [error, setError] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const previewFor = useRef<string | null>(null);

  const save = useCallback((next: Partial<Saved>) => {
    const cur = loadSaved() ?? { role: "", cv: "", step: "role" as Step };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...cur, ...next }));
  }, []);

  const go = useCallback(
    (next: Step) => {
      setStep(next);
      save({ step: next });
      setError("");
    },
    [save],
  );

  // Restore order: voice draft > saved progress > fresh. A Stripe cancel
  // return lands directly on the payment step with everything intact.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const draftRaw = localStorage.getItem(DRAFT_KEY);
    if (draftRaw) {
      localStorage.removeItem(DRAFT_KEY);
      try {
        const draft = JSON.parse(draftRaw) as { target_role?: string; cv_text?: string };
        if (draft.target_role || draft.cv_text) {
          const r = draft.target_role ?? "";
          const c = draft.cv_text ?? "";
          setRole(r);
          setCv(c);
          setFromVoice(true);
          localStorage.setItem(
            SAVE_KEY,
            JSON.stringify({ role: r, cv: c, step: "role", fromVoice: true } satisfies Saved),
          );
          return;
        }
      } catch {
        /* corrupt draft — fall through */
      }
    }
    const saved = loadSaved();
    if (saved) {
      setRole(saved.role);
      setCv(saved.cv);
      setFromVoice(!!saved.fromVoice);
      setStep(params.get("canceled") && saved.cv ? "pay" : saved.step);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The teaser: fetched on entering the step, once per role value.
  useEffect(() => {
    if (step !== "teaser") return;
    const r = role.trim();
    if (previewFor.current === r && preview && preview !== "error") return;
    previewFor.current = r;
    setPreview("loading");
    api
      .jobsPreview(r)
      .then(setPreview)
      .catch(() => setPreview("error"));
  }, [step, role, preview]);

  const pay = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const run = await api.createRun({ email, target_role: role.trim(), cv_text: cv.trim(), provider });
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
          onClose: () => {
            setBusy(false);
            setNotice("Checkout closed — no charge. Everything's still here when you're ready.");
          },
          callback: () => {
            localStorage.removeItem(SAVE_KEY);
            setRunId(run.run_id);
          },
        })
        .openIframe();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Couldn't start the run — nothing was charged.");
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
    <div className="pt-2 sm:pt-6">
      {step === "role" && (
        <StepShell step="role">
          {fromVoice && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent">
              <Mic className="size-3.5" /> Pulled from your call — edit if anything&apos;s off
            </p>
          )}
          <h1 className="display text-3xl sm:text-4xl">
            What role are you going after?
          </h1>
          <p className="mt-3 text-sm text-muted">
            Any role, any industry — Ada speaks recruiter in all of them.
          </p>
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (roleValid(role)) {
                save({ role: role.trim() });
                go("cv");
              }
            }}
          >
            <Input
              autoFocus
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Sales Manager, Registered Nurse, Accountant"
              className="!py-3.5 text-base"
              aria-label="Target role"
            />
            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-muted">
                {roleValid(role) ? "Enter ↵ to continue" : "A real role name unlocks the next step"}
              </span>
              <Button type="submit" disabled={!roleValid(role)} className="group">
                Continue
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          </form>
        </StepShell>
      )}

      {step === "cv" && (
        <StepShell step="cv">
          {fromVoice && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent">
              <Mic className="size-3.5" /> Pulled from your call — edit if anything&apos;s off
            </p>
          )}
          <h1 className="display text-3xl sm:text-4xl">Paste your current CV.</h1>
          <p className="mt-3 text-sm text-muted">
            Rough is fine — Ada does the polishing. She works only with what&apos;s
            really in it; nothing gets invented.
          </p>
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              if (cvValid(cv)) {
                save({ cv: cv.trim() });
                go("teaser");
              }
            }}
          >
            <Textarea
              autoFocus
              rows={12}
              value={cv}
              onChange={(e) => setCv(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && cvValid(cv)) {
                  e.preventDefault();
                  save({ cv: cv.trim() });
                  go("teaser");
                }
              }}
              placeholder="Paste the whole thing — experience, education, the lot."
              aria-label="Your current CV"
            />
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => go("role")}
                className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted max-sm:hidden">
                  {cvValid(cv) ? "⌘/Ctrl + Enter to continue" : "A few lines of real experience unlocks this"}
                </span>
                <Button type="submit" disabled={!cvValid(cv)} className="group">
                  Continue
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </form>
        </StepShell>
      )}

      {step === "teaser" && (
        <StepShell step="teaser">
          {preview === "loading" || preview === null ? (
            <div className="flex items-center gap-3 py-16 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Checking the job board for {role.trim()} roles…
            </div>
          ) : preview === "error" ? (
            <>
              <h1 className="display text-3xl sm:text-4xl">The board&apos;s not answering.</h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                I couldn&apos;t get a quick look at the job board just now — no matter.
                The full run does its own, much deeper search either way.
              </p>
            </>
          ) : preview.count === 0 ? (
            <>
              <h1 className="display text-3xl sm:text-4xl">
                Nothing under that exact title — yet.
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                My quick peek found no open roles titled like “{role.trim()}”. That
                happens with very specific titles — a broader one (say, “Sales
                Manager” rather than “Regional FMCG Sales Lead”) usually surfaces
                more. The full run also searches far more deeply than this glance.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => go("role")}>
                  <ArrowLeft className="size-4" /> Try a different title
                </Button>
                <Button onClick={() => go("pay")} className="group">
                  Carry on anyway
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="display text-3xl leading-tight sm:text-4xl">
                <em className="not-italic text-accent">{preview.count}</em> open{" "}
                {preview.count === 1 ? "role looks" : "roles look"} like a fit for a{" "}
                {role.trim()}.
              </h1>
              <p className="mt-3 text-sm text-muted">Here&apos;s a peek at what&apos;s out there:</p>
              <Card className="mt-6 divide-y divide-line !p-0">
                {preview.samples.map((j) => (
                  <p key={`${j.title}-${j.company}`} className="px-5 py-3.5 text-sm">
                    <span className="font-medium">{j.title}</span>
                    <span className="text-muted"> · {j.company} · {j.location}</span>
                  </p>
                ))}
              </Card>
              <p className="mt-3 text-xs text-muted">
                Match scores and tailored reasons come with the run — this is just the view
                from the door.
              </p>
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => go("cv")}
                  className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                  <ArrowLeft className="size-4" /> Back
                </button>
                <Button onClick={() => go("pay")} className="group">
                  Sounds good — continue
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </>
          )}
        </StepShell>
      )}

      {step === "pay" && (
        <StepShell step="pay">
          <h1 className="display text-3xl sm:text-4xl">Let Ada run.</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            She&apos;ll match you properly against every role she&apos;s got, tailor your
            CV for the best fits, and prep you for the interviews. One payment, no
            subscription — and a failed run is never charged.
          </p>
          {notice && (
            <p className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">{notice}</p>
          )}
          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {PROVIDERS.map((p) => {
              const selected = provider === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  aria-pressed={selected}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    selected ? "border-accent bg-accent-soft shadow-card" : "border-line hover:border-ink/30"
                  }`}
                >
                  <span
                    className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors ${
                      selected ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent"
                    }`}
                  >
                    <Check className="size-3" />
                  </span>
                  <p className={`text-sm font-medium ${selected ? "text-accent" : ""}`}>{p.name}</p>
                  <p className="display mt-1 text-2xl">{p.price}</p>
                  <p className="mt-1 text-xs text-muted">{p.detail}</p>
                </button>
              );
            })}
          </div>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <div className="mt-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => go("teaser")}
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            <Button onClick={pay} loading={busy} className="group !px-7 !py-3.5">
              Run Ada
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          <p className="mt-4 text-right text-xs text-muted">
            Payment unlocks the run. Failed runs are never charged.
          </p>
        </StepShell>
      )}
    </div>
  );
}

export default function NewRunPage() {
  return (
    <Suspense>
      <NewRun />
    </Suspense>
  );
}
