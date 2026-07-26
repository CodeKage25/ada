"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { useRef } from "react";

const EASE = [0.21, 0.6, 0.35, 1] as const;

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
      {/* Editorial indent on the second line — the headline steps, it doesn't stack */}
      <span className="hidden lg:inline-block lg:w-[1.1em]" aria-hidden />
      {lines[1].map(word)}
      <motion.em
        className="relative inline-block text-gold"
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

/** Editorial process timeline: a rail that draws itself as you read, ghost
 *  serif numerals behind each step, alternating indents. The rail's fill IS
 *  your progress through the process — motion with a meaning. */
export function Timeline({ steps }: { steps: { title: string; body: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.55"],
  });
  const scaleY = useSpring(scrollYProgress, { stiffness: 130, damping: 27 });
  return (
    <div ref={ref} className="relative pl-10">
      <div className="absolute bottom-2 left-3 top-2 w-px bg-line" aria-hidden />
      <motion.div
        className="absolute bottom-2 left-3 top-2 w-px origin-top bg-accent"
        style={reduce ? undefined : { scaleY }}
        aria-hidden
      />
      <ol className="space-y-16">
        {steps.map((step, i) => (
          <li key={step.title} className={`relative ${i % 2 === 1 ? "lg:ml-16" : ""}`}>
            <span
              className="absolute -left-[31px] top-1.5 size-2.5 rounded-full border-2 border-accent bg-surface"
              aria-hidden
            />
            <p
              className="display pointer-events-none absolute -left-4 -top-9 select-none text-[5.5rem] leading-none text-accent/[0.09]"
              aria-hidden
            >
              {String(i + 1).padStart(2, "0")}
            </p>
            <Reveal delay={0.05}>
              <h3 className="relative mb-1.5 font-semibold">{step.title}</h3>
              <p className="relative max-w-md text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
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
