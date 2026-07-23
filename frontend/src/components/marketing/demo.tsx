"use client";

import { Check } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { Card, ScoreBar } from "@/components/ui";

const EASE = [0.21, 0.6, 0.35, 1] as const;

/** Once-per-session intro: a paper curtain with the wordmark that lifts away.
 *  Skipped for repeat visits (sessionStorage) and under reduced motion. */
export function IntroVeil() {
  const [show, setShow] = useState(true);
  // Layout effect so repeat visitors never see a flash of the veil.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || sessionStorage.getItem("ada.intro-seen")) {
      setShow(false);
      return;
    }
    sessionStorage.setItem("ada.intro-seen", "1");
  }, []);
  if (!show) return null;
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg"
      initial={{ y: 0 }}
      animate={{ y: "-100%" }}
      transition={{ delay: 1.05, duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
      onAnimationComplete={() => setShow(false)}
      aria-hidden
    >
      <motion.p
        className="display text-6xl"
        initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      >
        Ada<span className="text-accent">.</span>
      </motion.p>
    </motion.div>
  );
}

/** Wrapper that makes its child lean toward the cursor. No-op on touch and
 *  under reduced motion. */
export function Magnetic({
  children,
  strength = 0.22,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 190, damping: 15, mass: 0.3 });
  const y = useSpring(0, { stiffness: 190, damping: 15, mass: 0.3 });
  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={reset}
      style={{ x, y }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** Scroll-scrubbed statement: words brighten one by one as the paragraph moves
 *  through the viewport. Full opacity immediately under reduced motion. */
export function ScrubText({
  segments,
  className = "",
}: {
  segments: { text: string; className?: string }[];
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });
  const words = segments.flatMap((s) =>
    s.text.split(" ").map((w) => ({ w, cls: s.className ?? "" })),
  );
  return (
    <p ref={ref} className={className}>
      {words.map((item, i) => (
        <ScrubWord
          key={`${item.w}-${i}`}
          progress={scrollYProgress}
          start={i / words.length}
          end={(i + 1) / words.length}
          reduce={!!reduce}
          cls={item.cls}
        >
          {item.w}
        </ScrubWord>
      ))}
    </p>
  );
}

function ScrubWord({
  progress,
  start,
  end,
  reduce,
  cls,
  children,
}: {
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  start: number;
  end: number;
  reduce: boolean;
  cls: string;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, [start, end], [0.16, 1]);
  return (
    <motion.span
      style={reduce ? undefined : { opacity }}
      className={`inline-block whitespace-pre ${cls}`}
    >
      {children}{" "}
    </motion.span>
  );
}

/** Hairline accent bar across the very top that fills as the page scrolls. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-50 h-[2.5px] origin-left bg-accent"
      style={{ scaleX }}
      aria-hidden
    />
  );
}

/** Hero headline: words rise out of a blur one by one, then a hand-drawn
 *  underline sweeps beneath "hired". */
export function HeroHeadline() {
  const lines = [
    ["Meet", "Ada."],
    ["She", "gets", "you"],
  ];
  let i = 0;
  const word = (w: string) => {
    const delay = 0.15 + i++ * 0.08;
    return (
      <motion.span
        key={`${w}-${i}`}
        className="inline-block whitespace-pre"
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, delay, ease: EASE }}
      >
        {w}{" "}
      </motion.span>
    );
  };
  return (
    <h1 className="display fluid-hero">
      {lines[0].map(word)}
      <br />
      {lines[1].map(word)}
      <motion.em
        className="relative inline-block text-accent"
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, delay: 0.15 + 5 * 0.08, ease: EASE }}
      >
        hired.
        <svg
          className="absolute -bottom-[0.12em] left-0 w-full"
          viewBox="0 0 220 16"
          fill="none"
          aria-hidden
        >
          <motion.path
            d="M5 11 C 55 3, 115 15, 215 7"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 1, ease: "easeOut" }}
          />
        </svg>
      </motion.em>
    </h1>
  );
}

/** Self-running demo of a real run: the same stages, matches, and scorecard the
 *  product renders — no screenshots, no mockups. Loops forever in the hero. */

const STAGES = [
  "Reading your background",
  "Rewriting your CV for the role",
  "Searching for your best-fit roles",
  "Preparing your interview questions",
];

const MATCHES = [
  { title: "Regional Sales Manager", company: "Coca-Cola HBC", location: "Lagos · On-site", match: 93 },
  { title: "Business Development Lead", company: "MTN", location: "Hybrid", match: 88 },
  { title: "Key Account Manager", company: "Nestlé", location: "Remote · West Africa", match: 84 },
];

function DemoCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % (STAGES.length + 3)), 1600);
    return () => clearInterval(id);
  }, []);

  const showMatches = step >= STAGES.length;
  const progress = Math.min(1, step / STAGES.length);

  return (
    <Card className="w-full overflow-hidden text-left shadow-lift">
      <div className="border-b border-line px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="display flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] text-accent">
              A
            </span>
            <p className="truncate text-xs font-medium">
              Amara <span className="text-muted">→ Sales Manager</span>
            </p>
          </div>
          <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted">
            <span
              className={`size-2 rounded-full ${showMatches ? "bg-success" : "pulse-soft bg-accent"}`}
            />
            {showMatches ? "Run complete" : "Running"}
          </p>
        </div>
        <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-line">
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
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    <p className="truncate text-[11px] text-muted">
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
  );
}

/** Floating proof chip: an outer absolutely-positioned motion wrapper carries
 *  the scroll parallax (drift), while the inner element keeps the CSS float
 *  animation and rotation — the two transforms never fight. */
function ProofChip({
  position,
  rotate = "",
  drift,
  delay,
  children,
}: {
  position: string;
  rotate?: string;
  drift?: ReturnType<typeof useTransform<number, number>>;
  delay?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className={`absolute z-10 max-lg:hidden ${position}`}
      style={drift ? { y: drift } : undefined}
      aria-hidden
    >
      <div
        className={`float-y flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-medium shadow-lift ${rotate}`}
        style={delay ? { animationDelay: delay } : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
}

/** Demo card with floating proof chips orbiting it. */
export function HeroShowcase() {
  const reduce = useReducedMotion();
  // Parallax: the card settles down-page slower than the chips as you scroll.
  const { scrollY } = useScroll();
  const cardDrift = useTransform(scrollY, [0, 700], [0, 46]);
  const chipDriftA = useTransform(scrollY, [0, 700], [0, -70]);
  const chipDriftB = useTransform(scrollY, [0, 700], [0, -110]);
  const chipDriftC = useTransform(scrollY, [0, 700], [0, -50]);
  // Pointer tilt on the card itself.
  const rotateX = useSpring(0, { stiffness: 160, damping: 16, mass: 0.4 });
  const rotateY = useSpring(0, { stiffness: 160, damping: 16, mass: 0.4 });
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rotateX.set(((e.clientY - r.top) / r.height - 0.5) * -12);
  };
  const untilt = () => {
    rotateX.set(0);
    rotateY.set(0);
  };
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="absolute -inset-10 -z-10 rounded-[3rem] bg-accent/10 blur-3xl"
        aria-hidden
      />
      <ProofChip position="-left-36 top-8" rotate="-rotate-3" drift={reduce ? undefined : chipDriftA}>
        <Check className="size-3.5 text-success" /> CV rewritten — ATS-safe
      </ProofChip>
      <ProofChip
        position="-right-28 top-1/3"
        rotate="rotate-2"
        drift={reduce ? undefined : chipDriftB}
        delay="1.2s"
      >
        <span className="display text-base text-accent">93%</span> match found
      </ProofChip>
      <ProofChip
        position="-left-28 bottom-10"
        rotate="rotate-1"
        drift={reduce ? undefined : chipDriftC}
        delay="2.1s"
      >
        Interview scored <span className="display text-base text-accent">8/10</span>
      </ProofChip>
      <motion.div
        onPointerMove={tilt}
        onPointerLeave={untilt}
        style={
          reduce
            ? undefined
            : { y: cardDrift, rotateX, rotateY, transformPerspective: 1000 }
        }
      >
        <DemoCard />
      </motion.div>
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
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Two counter-scrolling lanes of careers — Ada is for every industry, not
 *  just tech. Duplicated content makes the -50% translate loop seamless. */
const CAREERS_A = [
  "Registered Nurse",
  "Sales Manager",
  "Accountant",
  "Secondary School Teacher",
  "Civil Engineer",
  "Chef de Partie",
  "HR Business Partner",
  "Pharmacist",
  "Journalist",
  "Product Designer",
  "Logistics Coordinator",
  "Financial Analyst",
];

const CAREERS_B = [
  "Marketing Manager",
  "Lawyer",
  "Customer Success Lead",
  "Electrician",
  "Architect",
  "Data Analyst",
  "Flight Attendant",
  "Project Manager",
  "Social Media Manager",
  "Medical Officer",
  "Interior Designer",
  "Operations Manager",
];

function CareerLane({ roles, reverse = false }: { roles: string[]; reverse?: boolean }) {
  const row = [...roles, ...roles];
  return (
    <div className="relative overflow-hidden">
      <div className={`marquee-track gap-3 ${reverse ? "marquee-reverse" : ""}`}>
        {row.map((role, i) => (
          <span
            key={`${role}-${i}`}
            className="shrink-0 rounded-full border border-line bg-bg px-4 py-2 text-sm text-muted"
          >
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CareersBand() {
  return (
    <section className="overflow-hidden border-y border-line bg-surface py-12">
      <Reveal>
        <p className="eyebrow mb-2 text-center">For every career</p>
        <p className="display mx-auto mb-8 max-w-xl px-5 text-center text-2xl">
          Not just tech. <em className="text-accent">Every</em> industry.
        </p>
      </Reveal>
      {/* The moving lanes are decorative; screen readers get one sentence. */}
      <p className="sr-only">
        Ada works for every career — nurses, teachers, salespeople, lawyers, chefs,
        engineers, designers, and more.
      </p>
      <div className="relative space-y-3" aria-hidden>
        <CareerLane roles={CAREERS_A} />
        <CareerLane roles={CAREERS_B} reverse />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-surface to-transparent" />
      </div>
      <p className="mt-8 px-5 text-center text-sm text-muted">
        From classrooms to clinics to boardrooms — Ada speaks your industry&apos;s
        language.
      </p>
    </section>
  );
}
