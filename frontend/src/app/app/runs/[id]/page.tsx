"use client";

import { Check, Copy, Download, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

import { RunProgress } from "@/components/run/progress";
import { Button, Card, ScoreBar, Spinner } from "@/components/ui";
import { api, type RunResult } from "@/lib/api";

function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [run, setRun] = useState<RunResult | null>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .getRun(id)
      .then(setRun)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) return <p className="text-sm text-muted">Run not found.</p>;
  if (!run) return <Spinner label="Loading run..." />;

  // Arrived from Stripe success or still executing: show live progress.
  if (run.status !== "complete" && run.status !== "failed") {
    return (
      <>
        <h1 className="display mb-6 text-3xl">
          {params.get("paid") ? "Payment received." : "In progress."}
        </h1>
        <RunProgress runId={id} />
      </>
    );
  }

  if (run.status === "failed") {
    return (
      <Card className="p-6">
        <p className="font-medium text-danger">This run failed.</p>
        <p className="mt-1 text-sm text-muted">You were not charged for it.</p>
      </Card>
    );
  }

  const copyCv = async () => {
    await navigator.clipboard.writeText(run.rewritten_cv ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCv = () => {
    const blob = new Blob([run.rewritten_cv ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ada-cv-${run.target_role.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h1 className="display mb-1 text-3xl">{run.target_role}.</h1>
      <p className="mb-8 text-sm text-muted">Your complete run — CV, matches, interview.</p>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            ATS-optimised CV
          </h2>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyCv} className="!px-3 !py-1.5 text-xs">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="secondary"
              onClick={downloadCv}
              className="!px-3 !py-1.5 text-xs"
            >
              <Download className="size-3.5" /> Download
            </Button>
          </div>
        </div>
        <Card className="prose-ada max-h-[32rem] overflow-y-auto p-6 quiet-scroll">
          <ReactMarkdown>{run.rewritten_cv ?? ""}</ReactMarkdown>
        </Card>
      </section>

      {run.matches && run.matches.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Best-fit roles
          </h2>
          <div className="space-y-3">
            {run.matches.map((m, i) => (
              <Card key={i} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted">
                      {m.company} · {m.location}
                    </p>
                  </div>
                  <span className="display text-2xl text-accent">{m.match}%</span>
                </div>
                <div className="mt-3">
                  <ScoreBar value={m.match} />
                </div>
                <p className="mt-2 text-xs text-muted">{m.reason}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {run.questions && run.questions.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Mock interview
          </h2>
          <Card className="p-6">
            {run.interview ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Interview scored</p>
                  <p className="text-sm text-muted">
                    Overall {run.interview.overall_score}/10 — view your feedback.
                  </p>
                </div>
                <Link href={`/app/runs/${id}/interview`}>
                  <Button variant="secondary">Review feedback</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {run.questions.length} questions tailored to this role
                  </p>
                  <p className="text-sm text-muted">
                    Answer them and Ada scores you with specific feedback.
                  </p>
                </div>
                <Link href={`/app/runs/${id}/interview`}>
                  <Button>
                    <MessageSquareText className="size-4" /> Take the interview
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </section>
      )}
    </>
  );
}

export default function RunDetailPage() {
  return (
    <Suspense>
      <RunDetail />
    </Suspense>
  );
}
