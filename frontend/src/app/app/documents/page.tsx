"use client";

import { ArrowUpRight, FileText } from "lucide-react";
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
        <div className="space-y-3">
          {docs.map((doc) => (
            <Link key={doc.run_id} href={`/app/runs/${doc.run_id}`} className="group block">
              <Card hover className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
                    <FileText className="size-4 text-accent" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">CV — {doc.target_role}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(doc.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
