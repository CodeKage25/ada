"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { api, type RunSummary } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    api
      .listRuns()
      .then((runs) => setDocs(runs.filter((r) => r.status === "complete")))
      .catch(() => setDocs([]));
  }, []);

  return (
    <>
      <PageHeader
        title="Documents."
        subtitle="Every CV Ada has written for you, one per run."
      />
      {docs === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="px-5 py-4">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-2.5 h-3 w-24" />
            </Card>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No documents yet"
          body="Complete a run and your ATS-optimised CV lands here."
          action={
            <Link href="/app/new">
              <Button>Start a run</Button>
            </Link>
          }
        />
      ) : (
        // One container, divided rows — a file list, not a stack of cards. Rows
        // wash on hover (no lift) so this reads distinctly from the runs list.
        <Card className="divide-y divide-line overflow-hidden">
          {docs.map((doc, i) => (
            <Link
              key={doc.run_id}
              href={`/app/runs/${doc.run_id}`}
              className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors first:rounded-t-card last:rounded-b-card hover:bg-line/30 sm:px-5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                <FileText className="size-4 text-accent" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">CV — {doc.target_role}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {new Date(doc.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs tabular-nums text-muted/60 sm:block">
                #{String(docs.length - i).padStart(2, "0")}
              </span>
              <span className="text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
                Open
              </span>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
