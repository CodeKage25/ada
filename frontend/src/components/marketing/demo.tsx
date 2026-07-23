"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Card, ScoreBar } from "@/components/ui";

/** Self-running demo of a real run: the same stages, matches, and scorecard the
 *  product renders — no screenshots, no mockups. Loops forever in the hero. */

const STAGES = [
  "Reading your background",
  "Rewriting your CV for the role",
  "Searching for your best-fit roles",
  "Preparing your interview questions",
];

const MATCHES = [
  { title: "Senior Backend Engineer", company: "Paystack", location: "Lagos · Hybrid", match: 92 },
  { title: "Platform Engineer", company: "Andela", location: "Remote", match: 87 },
  { title: "Backend Engineer (Python)", company: "Flutterwave", location: "Remote · Africa", match: 84 },
];

export function HeroDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (STAGES.length + 2)), 1600);
    return () => clearInterval(id);
  }, []);

  const showMatches = step >= STAGES.length;

  return (
    <Card className="w-full max-w-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-xs font-medium text-muted">
          {showMatches ? "Run complete" : "Ada is running"}
        </p>
        <span className={`size-2 rounded-full ${showMatches ? "bg-success" : "pulse-soft bg-accent"}`} />
      </div>
      <div className="p-5">
        {showMatches ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {MATCHES.map((m) => (
              <div key={m.title}>
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-[11px] text-muted">
                      {m.company} · {m.location}
                    </p>
                  </div>
                  <span className="display text-xl text-accent">{m.match}%</span>
                </div>
                <div className="mt-1.5">
                  <ScoreBar value={m.match} />
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <ol className="space-y-3.5">
            {STAGES.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={label} className="flex items-center gap-3">
                  <span
                    className={`flex size-5 items-center justify-center rounded-full border text-[10px] ${
                      done
                        ? "border-accent bg-accent text-accent-ink"
                        : active
                          ? "border-accent text-accent"
                          : "border-line text-muted"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span
                    className={`text-[13px] ${done ? "text-ink" : active ? "pulse-soft text-ink" : "text-muted"}`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
