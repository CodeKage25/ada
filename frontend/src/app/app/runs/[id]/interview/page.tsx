"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Card, ScoreBar, Skeleton, Textarea } from "@/components/ui";
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

  if (!questions) {
    return (
      <div>
        <Skeleton className="h-9 w-56" />
        <Card className="mt-8 space-y-4 p-6">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-36 w-full" />
        </Card>
      </div>
    );
  }

  if (scorecard) {
    return (
      <>
        <Link
          href={`/app/runs/${id}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to run
        </Link>
        <div className="mb-8 flex items-end justify-between">
          <h1 className="display text-3xl">Your scorecard.</h1>
          <p className="display text-6xl text-accent">
            {scorecard.overall_score}
            <span className="text-xl text-muted">/10</span>
          </p>
        </div>
        <Card className="mb-8 border-l-2 !border-l-accent p-5">
          <p className="text-sm leading-relaxed">{scorecard.summary}</p>
        </Card>
        <div className="space-y-4">
          {scorecard.scores.map((s, i) => (
            <Card key={i} className="p-5 sm:p-6">
              <p className="eyebrow mb-2 !text-[10px]">Question {i + 1}</p>
              <p className="mb-3 text-sm font-medium leading-relaxed">{s.question}</p>
              <p className="mb-4 border-l-2 border-line pl-3 text-sm italic leading-relaxed text-muted">
                {s.answer || "(no answer)"}
              </p>
              <div className="mb-2.5 flex items-center gap-3">
                <ScoreBar value={s.score} max={10} />
                <span className="display shrink-0 text-lg">{s.score}/10</span>
              </div>
              <p className="text-sm leading-relaxed text-muted">{s.feedback}</p>
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
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to run
      </Link>
      <div className="mb-2 flex items-baseline justify-between">
        <h1 className="display text-3xl">Mock interview.</h1>
        <p className="text-sm tabular-nums text-muted">
          {index + 1} of {questions.length}
        </p>
      </div>
      <p className="mb-6 text-sm text-muted">
        Answer like it&apos;s the real thing — Ada scores substance, structure, and
        relevance.
      </p>

      {/* Segmented progress: answered, current, upcoming */}
      <div className="mb-6 flex gap-1.5" aria-hidden>
        {questions.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < index
                ? "bg-accent"
                : i === index
                  ? "bg-accent/50"
                  : "bg-line"
            }`}
          />
        ))}
      </div>

      <Card className="p-6 sm:p-8">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.21, 0.6, 0.35, 1] }}
        >
          <p className="display mb-5 text-xl leading-snug sm:text-2xl">
            {questions[index]}
          </p>
          <Textarea
            rows={7}
            autoFocus
            placeholder="Type your answer..."
            value={answers[index] ?? ""}
            onChange={(e) =>
              setAnswers((prev) => prev.map((a, i) => (i === index ? e.target.value : a)))
            }
          />
        </motion.div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex items-center justify-between">
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
