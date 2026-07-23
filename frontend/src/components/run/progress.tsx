"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui";
import { api, type RunStatus } from "@/lib/api";

/** Stages mirror the backend LangGraph: intake -> cv -> match -> interview.
 *  The status endpoint reports the node actually executing (run.stage), so the
 *  timeline shows real progress. Time-based pacing remains only as a fallback
 *  for runs that predate stage reporting. */
const STAGES = [
  { key: "intake", label: "Reading your background" },
  { key: "cv_rewrite", label: "Rewriting your CV for the role" },
  { key: "job_match", label: "Searching for your best-fit roles" },
  { key: "interview_prep", label: "Preparing your interview questions" },
];

const STAGE_INDEX = new Map(STAGES.map((s, i) => [s.key, i]));

const POLL_MS = 2500;
const STAGE_PACE_MS = 9000;

export function RunProgress({ runId }: { runId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<RunStatus>("pending_payment");
  const [stage, setStage] = useState(0);
  const runningSince = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const run = await api.getRun(runId);
        if (cancelled) return;
        setStatus(run.status);
        if (run.status === "running" || run.status === "paid") {
          const live = run.stage != null ? STAGE_INDEX.get(run.stage) : undefined;
          if (live !== undefined) {
            setStage(live);
          } else {
            runningSince.current ??= Date.now();
            const elapsed = Date.now() - runningSince.current;
            setStage(Math.min(STAGES.length - 1, Math.floor(elapsed / STAGE_PACE_MS)));
          }
        }
        if (run.status === "complete") {
          setStage(STAGES.length);
          setTimeout(() => router.push(`/app/runs/${runId}`), 900);
          return;
        }
        if (run.status !== "failed") setTimeout(tick, POLL_MS);
      } catch {
        if (!cancelled) setTimeout(tick, POLL_MS * 2);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [runId, router]);

  if (status === "failed") {
    return (
      <Card className="p-6">
        <p className="font-medium text-danger">Something went wrong during the run.</p>
        <p className="mt-1 text-sm text-muted">
          You won&apos;t be charged for a failed run — contact us and we&apos;ll make it
          right.
        </p>
      </Card>
    );
  }

  if (status === "pending_payment") {
    return (
      <Card className="p-6">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" /> Waiting for payment confirmation…
        </p>
      </Card>
    );
  }

  const complete = status === "complete";
  const pct = complete ? 100 : ((stage + 0.5) / STAGES.length) * 100;

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-line">
        <div
          className="h-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <p className="display text-xl">
            {complete ? "Done — opening your results." : "Ada is working on it."}
          </p>
          <p className="text-xs text-muted">
            {complete ? "" : "Usually under 3 minutes"}
          </p>
        </div>
        <ol>
          {STAGES.map((s, i) => {
            const done = i < stage || complete;
            const active = i === stage && !complete;
            const lastStage = i === STAGES.length - 1;
            return (
              <li key={s.key} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] transition-colors duration-300 ${
                      done
                        ? "border-accent bg-accent text-accent-ink"
                        : active
                          ? "border-accent text-accent"
                          : "border-line text-muted"
                    }`}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : active ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {!lastStage && (
                    <span
                      className={`w-px flex-1 ${done ? "bg-accent" : "bg-line"}`}
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={`pb-5 pt-0.5 text-sm ${
                    done ? "text-ink" : active ? "pulse-soft text-ink" : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
