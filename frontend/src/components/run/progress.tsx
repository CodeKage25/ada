"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui";
import { api, type RunStatus } from "@/lib/api";

/** Stages mirror the backend LangGraph: intake -> cv -> match -> interview. The
 *  API doesn't stream node progress, so within RUNNING the stages advance on a
 *  pace matched to typical node latency; COMPLETE snaps everything done. */
const STAGES = [
  { key: "intake", label: "Reading your background" },
  { key: "cv", label: "Rewriting your CV for the role" },
  { key: "match", label: "Searching for your best-fit roles" },
  { key: "interview", label: "Preparing your interview questions" },
];

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
          runningSince.current ??= Date.now();
          const elapsed = Date.now() - runningSince.current;
          setStage(Math.min(STAGES.length - 1, Math.floor(elapsed / STAGE_PACE_MS)));
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

  return (
    <Card className="p-6">
      <p className="display mb-5 text-xl">Ada is working on it.</p>
      <ol className="space-y-4">
        {STAGES.map((s, i) => {
          const done = i < stage || status === "complete";
          const active = i === stage && status !== "complete";
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className={`flex size-6 items-center justify-center rounded-full border text-[11px] ${
                  done
                    ? "border-accent bg-accent text-accent-ink"
                    : active
                      ? "border-accent text-accent"
                      : "border-line text-muted"
                }`}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={`text-sm ${
                  done ? "text-ink" : active ? "pulse-soft text-ink" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
