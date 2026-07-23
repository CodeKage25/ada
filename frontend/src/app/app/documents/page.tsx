"use client";

import { ArrowUpRight, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Card, EmptyState, Spinner } from "@/components/ui";
import { api, type RunSummary } from "@/lib/api";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<RunSummary[] | null>(null);

  useEffect(() => {
    api
      .listRuns()
      .then((runs) => setDocs(runs.filter((r) => r.status === "complete")))
      .catch(() => setDocs([]));
  }, []);

  if (docs === null) return <Spinner label="Loading documents..." />;

  return (
    <>
      <h1 className="display mb-2 text-3xl">Documents.</h1>
      <p className="mb-8 text-sm text-muted">
        Every CV Ada has written for you, one per run.
      </p>
      {docs.length === 0 ? (
        <EmptyState
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
            <Link key={doc.run_id} href={`/app/runs/${doc.run_id}`} className="block">
              <Card className="flex items-center justify-between px-5 py-4 transition-colors hover:border-ink/30">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium">CV — {doc.target_role}</p>
                    <p className="text-xs text-muted">
                      {new Date(doc.created_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
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
