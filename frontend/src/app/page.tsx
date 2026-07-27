import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  CareersBand,
  HeroHeadline,
  Reveal,
  ScrollProgress,
} from "@/components/marketing/demo";
import { HeroOrb } from "@/components/marketing/orb";
import { DeliverablesShowcase } from "@/components/marketing/showcase";
import { Eyebrow, Logo } from "@/components/ui";

const STEPS = [
  {
    title: "Tell Ada what you're going for",
    body: "Paste your CV and name the role — any role, any industry. Or just talk to her: a few minutes of voice intake is enough.",
  },
  {
    title: "Pay once, Ada runs",
    body: "₦2,000 or $15 unlocks the run. Paystack for Nigeria, cards for everywhere else.",
  },
  {
    title: "Your CV, rewritten for the role",
    body: "ATS-safe structure, recruiter vocabulary, achievement bullets — never invented facts.",
  },
  {
    title: "Your best-fit roles, ranked",
    body: "Semantic matching against real roles — scored, ranked, and explained.",
  },
  {
    title: "Interview-ready, with receipts",
    body: "Role-specific questions, then scored answers with feedback you can act on.",
  },
];

const FAQS = [
  {
    q: "What exactly do I get from a run?",
    a: "One complete run: your CV rewritten for a specific target role, a ranked list of best-fit roles with match scores, tailored interview questions, and scored feedback on your answers. Everything stays in your account.",
  },
  {
    q: "Is Ada only for tech jobs?",
    a: "No. Ada works for any career — nursing, sales, teaching, law, hospitality, finance, engineering, the lot. She rewrites for the vocabulary and conventions of your industry, not just software.",
  },
  {
    q: "Does a human read my CV?",
    a: "No. Ada does the entire run herself — rewrite, matching, interview prep, and scoring. That's the point: senior-level career help, delivered by an agent, in minutes.",
  },
  {
    q: "Will Ada invent experience I don't have?",
    a: "Never. Ada is explicitly constrained to work only with what you give her. She sharpens the truth; she doesn't fabricate employers, dates, or numbers.",
  },
  {
    q: "What if a run fails?",
    a: "Failed runs are never charged against — payment verification and execution are strictly tied, and a run that errors is flagged, not billed twice.",
  },
  {
    q: "How does Ada know my background for coaching?",
    a: "Import your LinkedIn profile (paste your profile text or export) once. Ada grounds every conversation and every run in it — advice about your actual career, not generic tips.",
  },
  {
    q: "Can I talk to Ada instead of typing?",
    a: "Yes. Voice intake is built in: Ada interviews you briefly, drafts your CV and target role from the conversation, and you review before paying.",
  },
];

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" aria-label="Ada home">
          <Logo />
        </Link>
        <nav className="eyebrow flex items-center gap-8 !text-muted max-sm:hidden">
          <a href="#how" className="transition-colors hover:!text-ink">How it works</a>
          <a href="#pricing" className="transition-colors hover:!text-ink">The tariff</a>
          <a href="#faqs" className="transition-colors hover:!text-ink">Questions</a>
        </nav>
        <div className="flex items-center gap-5">
          <Link href="/login" className="text-sm text-muted transition-colors hover:text-ink max-sm:hidden">
            Sign in
          </Link>
          <Link
            href="/app"
            className="rounded-[8px] bg-ink px-4 py-2 text-[13px] font-medium text-bg transition-opacity hover:opacity-90"
          >
            Open Ada
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  return (
    // The marketing site is noir-fixed: the dark Greenlight set, whatever the
    // app theme. The app keeps its own light/dark toggle.
    <div className="noir bg-bg text-ink">
      <ScrollProgress />
      <Nav />
      <main>
        {/* Hero — asymmetric editorial composition: type carries the left
            column, the live demo overlaps in from the right */}
        <section className="glow-field relative overflow-hidden">
          {/* Mobile reads headline → value → CTA → orb: understand Ada first,
              then meet her. On desktop the orb owns the right column. */}
          <div className="mx-auto grid max-w-6xl gap-y-12 px-5 pb-24 pt-32 sm:pt-36 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-x-4 lg:gap-y-0 lg:[grid-template-areas:'head_orb'_'body_orb']">
            <div className="lg:[grid-area:head]">
              <Reveal>
                <p className="eyebrow mb-8 flex items-center gap-3">
                  <span className="h-px w-10 bg-muted/50" aria-hidden />
                  Autonomous career agent
                  <span className="flex items-center gap-1.5 normal-case tracking-normal text-success">
                    <span className="pulse-soft size-1.5 rounded-full bg-success" />
                    live
                  </span>
                </p>
              </Reveal>
              <HeroHeadline />
            </div>
            <div className="lg:[grid-area:body]">
              <Reveal delay={0.5}>
                <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
                  One run: your CV rewritten for the role you want — in any industry —
                  your best-fit jobs ranked, and a scored mock interview. No humans in
                  the loop.
                </p>
              </Reveal>
              <Reveal delay={0.6}>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link
                    href="/app/new"
                    className="group inline-flex items-center gap-2.5 rounded-[10px] bg-ink px-8 py-4 text-base font-medium text-bg transition-opacity hover:opacity-90"
                  >
                    Start your run
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={0.7}>
                {/* Sidenote, not a stat grid: the numbers live inside a sentence */}
                <p className="mt-12 max-w-md border-l border-line pl-5 text-sm leading-loose text-muted">
                  Under <em className="display text-xl text-ink">three minutes</em> from
                  start to results. Pay{" "}
                  <em className="display text-xl text-ink">per run</em>, or go
                  unlimited from ₦5,000 a month.{" "}
                  <em className="display text-xl text-ink">Zero</em> humans reading
                  your CV.
                </p>
              </Reveal>
            </div>
            <Reveal delay={0.35} className="mt-2 lg:mt-14 lg:justify-self-center lg:[grid-area:orb]">
              <HeroOrb />
            </Reveal>
          </div>
        </section>

        {/* Every-career band */}
        <CareersBand />

        {/* Chapter: the problem. A paper interlude, set close and quiet —
            the one place the page whispers. */}
        <section className="bg-ink py-40 text-bg">
          <div className="mx-auto max-w-xl px-5">
            <Reveal>
              <p className="eyebrow mb-10 !text-bg/40">The problem</p>
              <p className="display text-[1.55rem] leading-[1.5] sm:text-[1.8rem]">
                Job searching is a full-time job you didn’t apply for. Rewriting
                your CV for every role. Guessing what recruiters search for.
                Walking into interviews cold.
              </p>
              <p className="display mt-10 text-[1.55rem] leading-[1.5] text-bg/60 sm:text-[1.8rem]">
                Ada does all of it — <em className="text-bg">in one run.</em>
              </p>
            </Reveal>
          </div>
        </section>

        {/* Deliverables — pinned scroll showcase on desktop, stacked on mobile */}
        <DeliverablesShowcase />

        {/* Chapter: the process, typeset as a document index — the way a
            bureau would file it. No cards, no rail, just the ledger. */}
        <section id="how" className="scroll-mt-24 border-y border-line bg-surface py-32">
          <div className="mx-auto max-w-3xl px-5">
            <Reveal>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="display fluid-h2 mt-3">The run, in five entries.</h2>
            </Reveal>
            <ol className="mt-14">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.04}>
                  <li className="group border-t border-line py-7 last:border-b">
                    <div className="flex items-baseline gap-6">
                      <span className="font-mono text-xs text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="display text-xl sm:text-2xl">{step.title}</h3>
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
                          {step.body}
                        </p>
                      </div>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Chapter: the tariff — a rate card, not pricing cards. */}
        <section id="pricing" className="scroll-mt-24 py-32">
          <div className="mx-auto max-w-2xl px-5">
            <Reveal>
              <Eyebrow>The tariff</Eyebrow>
              <h2 className="display fluid-h2 mt-3">One price to start. Two ways to stay.</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <dl className="mt-12">
                {[
                  {
                    item: "A run",
                    detail: "CV rewritten, matches ranked, interview scored",
                    price: "₦2,000 · $15",
                    seal: true,
                  },
                  {
                    item: "Pro",
                    detail: "Unlimited runs, every month",
                    price: "₦5,000 · $5 / mo",
                  },
                  {
                    item: "Premium",
                    detail: "Everything, with Ada on call by voice",
                    price: "₦12,000 · $12 / mo",
                  },
                ].map((row) => (
                  <div key={row.item} className="border-t border-line py-6 last:border-b">
                    <div className="flex items-baseline gap-3">
                      <dt className="display text-xl sm:text-2xl">
                        {row.item}
                        {row.seal && (
                          <span className="ml-2 inline-block size-2 rounded-full bg-accent align-middle" aria-hidden />
                        )}
                      </dt>
                      <span className="mx-1 flex-1 border-b border-dotted border-line" aria-hidden />
                      <dd className="shrink-0 font-mono text-sm text-ink">{row.price}</dd>
                    </div>
                    <p className="mt-1.5 text-sm text-muted">{row.detail}</p>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-xs leading-relaxed text-muted">
                A failed run is never charged. Annual Pro and Premium are ten months
                for the year. The seal marks where everyone starts.
              </p>
              <Link
                href="/app/new"
                className="group mt-10 inline-flex items-center gap-2.5 rounded-[10px] bg-ink px-7 py-3.5 font-medium text-bg transition-opacity hover:opacity-90"
              >
                Start with a run
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="scroll-mt-24 border-t border-line bg-surface py-28">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_2fr]">
            <Reveal>
              <Eyebrow>Questions</Eyebrow>
              <h2 className="display fluid-h2">FAQs.</h2>
            </Reveal>
            <div className="divide-y divide-line">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 0.03}>
                  <details className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center gap-4 text-[15px] font-medium transition-colors [&::-webkit-details-marker]:hidden">
                      <span className="display w-8 shrink-0 text-lg text-muted/50">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">{faq.q}</span>
                      <span className="shrink-0 font-mono text-base text-muted transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl pl-12 text-sm leading-relaxed text-muted">
                      {faq.a}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="relative overflow-hidden bg-ink py-32 text-center text-bg">
          <Reveal className="relative">
            <h2 className="display fluid-hero mx-auto max-w-3xl px-5">
              Go in <em>prepared</em>.
            </h2>
            <p className="mx-auto mt-5 max-w-md px-5 text-balance text-bg/60">
              The next role is already out there. Ada gets you ready for it — whatever
              the industry.
            </p>
            <div className="mt-9">
              <Link
                href="/app/new"
                className="group inline-flex items-center gap-2.5 rounded-[10px] bg-bg px-9 py-4 text-base font-medium text-ink transition-opacity hover:opacity-90"
              >
                Start your run
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mt-6 text-xs text-bg/50">
              ₦2,000 / $15 per run · Unlimited from ₦5,000 / $5 a month · Results in
              minutes
            </p>
          </Reveal>
        </section>
      </main>

      <footer className="overflow-hidden border-t border-line">
        <div className="mx-auto max-w-6xl px-5 pt-10">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <Logo className="text-base" />
              <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted">
                An autonomous career agent — no human reads your CV. Rewrite, match,
                rehearse. One run at a time, for every industry.
              </p>
            </div>
            <nav className="flex gap-10 text-xs text-muted">
              <div className="space-y-2">
                <p className="font-medium text-ink">Product</p>
                <a href="#how" className="block transition-colors hover:text-ink">How it works</a>
                <a href="#pricing" className="block transition-colors hover:text-ink">Pricing</a>
                <a href="#faqs" className="block transition-colors hover:text-ink">FAQs</a>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-ink">App</p>
                <Link href="/app/new" className="block transition-colors hover:text-ink">Start a run</Link>
                <Link href="/app/coach" className="block transition-colors hover:text-ink">Ask Ada</Link>
                <Link href="/login" className="block transition-colors hover:text-ink">Sign in</Link>
              </div>
            </nav>
          </div>
          <p className="mt-8 border-t border-line pt-6 text-xs text-muted">
            © {new Date().getFullYear()} Ada · Built for the next role, not the last one.
          </p>
        </div>
        {/* Oversized wordmark, cropped by the viewport */}
        <div className="pointer-events-none select-none" aria-hidden>
          <p className="display -mb-[0.24em] text-center text-[26vw] leading-[0.8] text-ink/[0.045]">
            Ada.
          </p>
        </div>
      </footer>
    </div>
  );
}
