"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, ScoreBar, Spinner, Textarea } from "@/components/ui";
import { api, type Scorecard } from "@/lib/api";

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [scoring, setScoring] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getRun(id).then((run) => {
      setQuestions(run.questions ?? []);
      setAnswers(new Array(run.questions?.length ?? 0).fill(""));
      if (run.interview) setScorecard(run.interview);
    });
  }, [id]);

  if (!questions) return <Spinner label="Loading interview..." />;

  if (scorecard) {
    return (
      <>
        <Link
          href={`/app/runs/${id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to run
        </Link>
        <div className="mb-8 flex items-end justify-between">
          <h1 className="display text-3xl">Your scorecard.</h1>
          <p className="display text-5xl text-accent">
            {scorecard.overall_score}
            <span className="text-xl text-muted">/10</span>
          </p>
        </div>
        <Card className="mb-6 p-5">
          <p className="text-sm leading-relaxed">{scorecard.summary}</p>
        </Card>
        <div className="space-y-4">
          {scorecard.scores.map((s, i) => (
            <Card key={i} className="p-5">
              <p className="mb-2 text-sm font-medium">{s.question}</p>
              <p className="mb-3 border-l-2 border-line pl-3 text-sm text-muted">
                {s.answer || "(no answer)"}
              </p>
              <div className="mb-2 flex items-center gap-3">
                <ScoreBar value={s.score} max={10} />
                <span className="display shrink-0 text-lg">{s.score}/10</span>
              </div>
              <p className="text-sm text-muted">{s.feedback}</p>
            </Card>
          ))}
        </div>
      </>
    );
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted">This run has no interview questions yet.</p>;
  }

  const submit = async () => {
    setScoring(true);
    setError("");
    try {
      setScorecard(await api.scoreInterview(id, answers));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed — try again.");
    } finally {
      setScoring(false);
    }
  };

  const last = index === questions.length - 1;

  return (
    <>
      <Link
        href={`/app/runs/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to run
      </Link>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="display text-3xl">Mock interview.</h1>
        <p className="text-sm text-muted">
          {index + 1} of {questions.length}
        </p>
      </div>
      <p className="mb-8 text-sm text-muted">
        Answer like it&apos;s the real thing — Ada scores substance, structure, and
        relevance.
      </p>

      <Card className="p-6">
        <p className="mb-4 font-medium">{questions[index]}</p>
        <Textarea
          rows={7}
          autoFocus
          placeholder="Type your answer..."
          value={answers[index] ?? ""}
          onChange={(e) =>
            setAnswers((prev) => prev.map((a, i) => (i === index ? e.target.value : a)))
          }
        />
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-between">
          <Button
            variant="ghost"
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ArrowLeft className="size-4" /> Previous
          </Button>
          {last ? (
            <Button onClick={submit} loading={scoring}>
              <Sparkles className="size-4" /> Score my interview
            </Button>
          ) : (
            <Button onClick={() => setIndex((i) => i + 1)}>
              Next <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
