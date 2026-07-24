"use client";

import { ArrowRight, ArrowUp, Check } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/app/shell";
import { RunProgress } from "@/components/run/progress";
import { Button } from "@/components/ui";
import { api, type JobsPreview } from "@/lib/api";
import { loadPaystack } from "@/lib/paystack";

/** Conversational onboarding: Ada asks for the role, teases the job market
 *  from a cheap keyword lookup (no scores — that's the paid part), collects
 *  the CV, then makes the offer with the existing payment options. Payment,
 *  webhooks, and the run pipeline are untouched. Answers persist across
 *  refresh; cancelling checkout keeps the conversation. */

const DRAFT_KEY = "ada.intake-draft"; // handed over by the voice call
const SAVE_KEY = "ada.onboarding"; // survives refresh until payment starts

type Step = "role" | "cv" | "offer";

type Msg =
  | { from: "user"; text: string }
  | { from: "ada"; text: string }
  | { from: "ada"; kind: "jobs"; preview: JobsPreview; role: string }
  | { from: "ada"; kind: "retry-role" };

const PROVIDERS = [
  { value: "paystack", name: "Paystack", price: "₦2,000", detail: "Nigeria" },
  { value: "stripe", name: "Card via Stripe", price: "$15", detail: "Worldwide" },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function loadSaved(): { role: string; cv: string; step: Step } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { role?: string; cv?: string; step?: Step };
    if (!s.role && !s.cv) return null;
    return { role: s.role ?? "", cv: s.cv ?? "", step: s.step ?? "role" };
  } catch {
    return null;
  }
}

function AdaMark() {
  return (
    <span className="display mt-0.5 flex size-7 shrink-0 select-none items-center justify-center rounded-full bg-accent-soft text-[13px] text-accent">
      A
    </span>
  );
}

function Bubble({ msg, children }: { msg?: Msg; children?: React.ReactNode }) {
  if (msg?.from === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-ink">
          {msg.text}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <AdaMark />
      <div className="min-w-0 max-w-[88%] pt-0.5 text-sm leading-relaxed">
        {msg && "text" in msg ? <p>{msg.text}</p> : children}
      </div>
    </motion.div>
  );
}

function NewRun() {
  const { email } = useAuth();
  const params = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("role");
  const [input, setInput] = useState("");
  const [role, setRole] = useState("");
  const [cv, setCv] = useState("");
  const [provider, setProvider] = useState<"paystack" | "stripe">("paystack");
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef(""); // current role for retry chips

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);

  const say = useCallback(async (items: Msg[], instant = false) => {
    for (const m of items) {
      if (!instant) {
        setTyping(true);
        const len = "text" in m && m.text ? m.text.length : 60;
        await sleep(500 + Math.min(900, len * 6));
        setTyping(false);
      }
      push(m);
      if (!instant) await sleep(220);
    }
  }, []);

  const save = (next: Partial<{ role: string; cv: string; step: Step }>) => {
    const cur = loadSaved() ?? { role: "", cv: "", step: "role" as Step };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...cur, ...next }));
  };

  /** The teaser: cheap lookup, honest phrasing, no paid output. */
  const runTeaser = useCallback(
    async (forRole: string, instant = false) => {
      roleRef.current = forRole;
      if (!instant) {
        setTyping(true);
        await sleep(500);
      }
      let preview: JobsPreview | null = null;
      try {
        preview = await api.jobsPreview(forRole);
      } catch {
        /* teaser is best-effort */
      }
      setTyping(false);
      if (!preview) {
        push({
          from: "ada",
          text: "I couldn't reach the job board for a quick look just now — no matter, the full run does its own, much deeper search.",
        });
        return;
      }
      if (preview.count === 0) {
        push({ from: "ada", kind: "retry-role" });
        return;
      }
      push({ from: "ada", kind: "jobs", preview, role: forRole });
    },
    [],
  );

  // Opening sequence: voice draft > saved conversation > fresh start.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      // Voice intake handed over a draft: acknowledge instead of re-asking.
      const draftRaw = localStorage.getItem(DRAFT_KEY);
      if (draftRaw) {
        localStorage.removeItem(DRAFT_KEY);
        try {
          const draft = JSON.parse(draftRaw) as { target_role?: string; cv_text?: string };
          if (draft.target_role && draft.cv_text) {
            setRole(draft.target_role);
            setCv(draft.cv_text);
            setStep("offer");
            save({ role: draft.target_role, cv: draft.cv_text, step: "offer" });
            await say([
              {
                from: "ada",
                text: `Good call. From our conversation I've got your target — ${draft.target_role} — and a draft of your CV, so no need to repeat yourself.`,
              },
            ]);
            await runTeaser(draft.target_role);
            await say([offerMsg()]);
            return;
          }
        } catch {
          /* corrupt draft — fall through to normal flow */
        }
      }

      const saved = loadSaved();
      const cancelled = params.get("canceled");
      if (saved?.role) {
        // Rebuild a condensed conversation rather than replaying the script.
        setRole(saved.role);
        setCv(saved.cv);
        roleRef.current = saved.role;
        push({
          from: "ada",
          text: `Welcome back — ${saved.role}${saved.cv ? ", CV saved" : ""}. Here's where we were.`,
        });
        if (cancelled) {
          push({ from: "ada", text: "Checkout was cancelled, so nothing was charged. Ready when you are." });
        }
        if (saved.cv) {
          setStep("offer");
          await runTeaser(saved.role, true);
          push(offerMsg());
        } else {
          setStep("cv");
          await runTeaser(saved.role, true);
          push({
            from: "ada",
            text: "Now paste your current CV. Rough is fine — I do the polishing.",
          });
        }
        return;
      }

      setStep("role");
      await say([
        { from: "ada", text: "Hi — I'm Ada. Let's set up your run; I only need two things." },
        { from: "ada", text: "First: what role are you going after?" },
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function offerMsg(): Msg {
    return {
      from: "ada",
      text: "Want me to match you properly, tailor your CV for the best fits, and prep you for the interviews? One payment, no subscription — and a failed run is never charged.",
    };
  }

  const submitRole = async (text: string) => {
    const value = text.trim();
    push({ from: "user", text: value });
    setInput("");
    if (value.length < 2 || !/[a-zA-Z]{2,}/.test(value)) {
      await say([
        { from: "ada", text: "Give me a little more than that — a real role name, like “Sales Manager” or “Registered Nurse”." },
      ]);
      return;
    }
    setRole(value);
    save({ role: value, step: "cv" });
    await say([{ from: "ada", text: `${value} — nice. Let me take a quick look at the job board…` }]);
    await runTeaser(value);
    setStep("cv");
    await say([
      { from: "ada", text: "Now paste your current CV. Rough is fine — I do the polishing." },
    ]);
  };

  const submitCv = async (text: string) => {
    const value = text.trim();
    const label =
      value.length > 160 ? `${value.slice(0, 160)}…\n(${value.length.toLocaleString()} characters)` : value;
    push({ from: "user", text: label });
    setInput("");
    if (value.length < 30) {
      await say([
        { from: "ada", text: "That looks a bit short — I need at least a few lines of real experience to work with. Paste the whole thing; messy is fine." },
      ]);
      return;
    }
    setCv(value);
    setStep("offer");
    save({ cv: value, step: "offer" });
    await say([
      { from: "ada", text: "Got it — that's everything I need." },
      offerMsg(),
    ]);
  };

  const retryRole = async () => {
    setStep("role");
    save({ role: "", step: "role" });
    await say([{ from: "ada", text: "Sure — what title should I look for instead?" }]);
  };

  const carryOn = async () => {
    setStep("cv");
    await say([
      { from: "ada", text: "Onwards, then — the full run searches far deeper than my quick peek. Paste your current CV; rough is fine." },
    ]);
  };

  const pay = async () => {
    setBusy(true);
    try {
      const run = await api.createRun({ email, target_role: role, cv_text: cv, provider });
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
            void say([
              { from: "ada", text: "No charge — checkout closed. Everything we've done is saved, so I'm here whenever you're ready." },
            ]);
          },
          callback: () => {
            localStorage.removeItem(SAVE_KEY);
            setRunId(run.run_id);
          },
        })
        .openIframe();
    } catch (err) {
      setBusy(false);
      void say([
        {
          from: "ada",
          text: `Hmm — ${err instanceof Error ? err.message : "I couldn't start the run"}. Nothing was charged; try again in a moment.`,
        },
      ]);
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

  const composerActive = (step === "role" || step === "cv") && !typing;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col lg:h-[calc(100dvh-7rem)]">
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-4">
        <h1 className="display text-2xl">Start a run.</h1>
        <button
          onClick={() => {
            localStorage.removeItem(SAVE_KEY);
            window.location.href = "/app/new";
          }}
          className="text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Start over
        </button>
      </div>

      <div className="quiet-scroll flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.map((m, i) => {
          if (m.from === "ada" && "kind" in m && m.kind === "jobs") {
            const { preview, role: forRole } = m;
            return (
              <Bubble key={i}>
                <p>
                  I&apos;m seeing{" "}
                  <em className="display not-italic text-base text-accent">
                    {preview.count} open {preview.count === 1 ? "role" : "roles"}
                  </em>{" "}
                  that look like a fit for a {forRole} — here&apos;s a peek:
                </p>
                <div className="mt-3 space-y-2 rounded-xl border border-line bg-bg p-3">
                  {preview.samples.map((j) => (
                    <p key={`${j.title}-${j.company}`} className="text-[13px]">
                      <span className="font-medium">{j.title}</span>
                      <span className="text-muted"> · {j.company} · {j.location}</span>
                    </p>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Match scores and tailored reasons come with the run.
                </p>
              </Bubble>
            );
          }
          if (m.from === "ada" && "kind" in m && m.kind === "retry-role") {
            return (
              <Bubble key={i}>
                <p>
                  Honestly? I&apos;m not seeing open roles under that exact title in my
                  quick peek. That happens with very specific titles — a broader one
                  usually surfaces more. The full run also searches much more deeply
                  than this glance.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={retryRole}
                    className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent"
                  >
                    Try a different title
                  </button>
                  <button
                    onClick={carryOn}
                    className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    Carry on anyway
                  </button>
                </div>
              </Bubble>
            );
          }
          return <Bubble key={i} msg={m} />;
        })}

        {typing && (
          <div className="flex gap-3">
            <AdaMark />
            <span className="flex items-center gap-1 pt-2" aria-label="Ada is typing">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="pulse-soft size-1.5 rounded-full bg-muted"
                  style={{ animationDelay: `${d * 0.2}s` }}
                />
              ))}
            </span>
          </div>
        )}

        {/* The offer: payment options live in the conversation */}
        {step === "offer" && !typing && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-10 max-w-md rounded-2xl border border-line bg-surface p-4 shadow-card"
          >
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => {
                const selected = provider === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setProvider(p.value)}
                    aria-pressed={selected}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-line hover:border-ink/30"
                    }`}
                  >
                    <span
                      className={`absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full border ${
                        selected
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line text-transparent"
                      }`}
                    >
                      <Check className="size-2.5" />
                    </span>
                    <p className={`text-xs font-medium ${selected ? "text-accent" : ""}`}>
                      {p.name}
                    </p>
                    <p className="display mt-0.5 text-xl">{p.price}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{p.detail}</p>
                  </button>
                );
              })}
            </div>
            <Button onClick={pay} loading={busy} className="group mt-3 w-full !py-3">
              Run Ada
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted">
              Payment unlocks the run. Failed runs are never charged.
            </p>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer: input for the role, paste-box for the CV */}
      {step !== "offer" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || !composerActive) return;
            void (step === "role" ? submitRole(input) : submitCv(input));
          }}
          className="pt-2"
        >
          <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface p-2 shadow-card transition-colors focus-within:border-accent">
            <textarea
              rows={step === "cv" ? 4 : 1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && step === "role") {
                  e.preventDefault();
                  if (input.trim() && composerActive) void submitRole(input);
                }
              }}
              placeholder={
                step === "role"
                  ? "e.g. Sales Manager, Registered Nurse, Accountant"
                  : "Paste your CV here — then hit send"
              }
              className="quiet-scroll max-h-48 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted/70"
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim() || !composerActive}
              className="rounded-full bg-accent p-2.5 text-accent-ink shadow-btn transition-transform hover:scale-105 disabled:opacity-40 disabled:shadow-none"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
          {step === "cv" && (
            <p className="mt-2 text-center text-[11px] text-muted/70">
              Shift+Enter for a new line · send when it&apos;s all in
            </p>
          )}
        </form>
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
