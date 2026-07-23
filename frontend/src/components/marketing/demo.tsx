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
    const id = setInterval(() => setStep((s) => (s + 1) % (STAGES.length + 3)), 1600);
    return () => clearInterval(id);
  }, []);

  const showMatches = step >= STAGES.length;
  const progress = Math.min(1, step / STAGES.length);

  return (
    <div className="relative w-full max-w-md">
      {/* Soft halo behind the card */}
      <div
        className="absolute -inset-8 -z-10 rounded-[2.5rem] bg-accent/10 blur-3xl"
        aria-hidden
      />
      <Card className="w-full overflow-hidden shadow-lift">
        <div className="border-b border-line px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <span
                className={`size-2 rounded-full ${showMatches ? "bg-success" : "pulse-soft bg-accent"}`}
              />
              {showMatches ? "Run complete — 3 matches found" : "Ada is running"}
            </p>
            <span className="display text-sm text-muted/70">
              Ada<span className="text-accent">.</span>
            </span>
          </div>
          <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="p-5">
          {showMatches ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {MATCHES.map((m, i) => (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.12 }}
                >
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
                </motion.div>
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
                      className={`flex size-5 items-center justify-center rounded-full border text-[10px] transition-colors ${
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
    </div>
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

/** Endless ticker of roles Ada has rewritten CVs for. Duplicated content makes
 *  the -50% translate loop seamless. */
export function RoleTicker({ roles }: { roles: string[] }) {
  const row = [...roles, ...roles];
  return (
    <div
      className="relative overflow-hidden border-y border-line bg-surface py-3.5"
      aria-hidden
    >
      <div className="marquee-track">
        {row.map((role, i) => (
          <span
            key={`${role}-${i}`}
            className="flex shrink-0 items-center gap-6 pr-6 text-sm text-muted"
          >
            {role}
            <span className="size-1 rounded-full bg-accent/60" />
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
    </div>
  );
}
