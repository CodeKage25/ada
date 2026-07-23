"use client";

import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { api, type RunSummary } from "@/lib/api";

const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "warn" | "danger"; pulse?: boolean }> = {
  pending_payment: { label: "Awaiting payment", tone: "warn" },
  paid: { label: "Queued", tone: "accent" },
  running: { label: "Running", tone: "accent", pulse: true },
  complete: { label: "Complete", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

function RunListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="px-5 py-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2.5 h-3 w-32" />
        </Card>
      ))}
    </div>
  );
}

export default function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    api.listRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  return (
    <>
      <PageHeader
        title="My runs."
        subtitle="Every run in one place — open one for its CV, matches, and interview."
        action={
          <Link href="/app/new">
            <Button>
              <Plus className="size-4" /> New run
            </Button>
          </Link>
        }
      />

      {runs === null ? (
        <RunListSkeleton />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-5" />}
          title="No runs yet"
          body="Start your first run — Ada rewrites your CV, finds matching roles, and preps your interview."
          action={
            <Link href="/app/new">
              <Button>Start a run</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const status = STATUS[run.status] ?? { label: run.status, tone: "neutral" as const };
            return (
              <Link key={run.run_id} href={`/app/runs/${run.run_id}`} className="group block">
                <Card hover className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{run.target_role}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={status.tone} pulse={status.pulse}>
                        {status.label}
                      </StatusBadge>
                      {run.has_interview && (
                        <StatusBadge tone="accent">Interview scored</StatusBadge>
                      )}
                      <span className="text-xs text-muted">
                        {new Date(run.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
