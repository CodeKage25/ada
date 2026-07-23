"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { api, type RunSummary } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Queued",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    api.listRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  if (runs === null) return <Spinner label="Loading your runs..." />;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="display text-3xl">My runs.</h1>
        <Link href="/app/new">
          <Button>
            <Plus className="size-4" /> New run
          </Button>
        </Link>
      </div>

      {runs.length === 0 ? (
        <EmptyState
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
          {runs.map((run) => (
            <Link key={run.run_id} href={`/app/runs/${run.run_id}`} className="block">
              <Card className="flex items-center justify-between px-5 py-4 transition-colors hover:border-ink/30">
                <div>
                  <p className="font-medium">{run.target_role}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(run.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {STATUS_LABEL[run.status] ?? run.status}
                    {run.has_interview && " · Interview scored"}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
