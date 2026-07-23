import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  CareersBand,
  HeroHeadline,
  HeroShowcase,
  IntroVeil,
  Magnetic,
  Reveal,
  ScrollProgress,
  ScrubText,
} from "@/components/marketing/demo";
import { DeliverablesShowcase } from "@/components/marketing/showcase";
import { Button, Card, Eyebrow, Logo, ThemeToggle } from "@/components/ui";

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
    q: "What exactly do I get for one payment?",
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

const RECEIPT_ITEMS = [
  ["CV rewritten for your role", "included"],
  ["Best-fit roles, ranked with reasons", "included"],
  ["Mock interview, scored 0–10", "included"],
  ["Coaching chat, grounded in your runs", "unlimited"],
  ["Failed runs", "never charged"],
] as const;

function Nav() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 px-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between rounded-full border border-line/70 bg-surface/80 py-2 pl-5 pr-2 shadow-card backdrop-blur-xl">
        <Link href="/" aria-label="Ada home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-sm text-muted max-sm:hidden">
          <a href="#how" className="rounded-full px-3 py-1.5 transition-colors hover:bg-line/40 hover:text-ink">
            How it works
          </a>
          <a href="#pricing" className="rounded-full px-3 py-1.5 transition-colors hover:bg-line/40 hover:text-ink">
            Pricing
          </a>
          <a href="#faqs" className="rounded-full px-3 py-1.5 transition-colors hover:bg-line/40 hover:text-ink">
            FAQs
          </a>
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/login" className="px-2 text-sm text-muted transition-colors hover:text-ink max-sm:hidden">
            Sign in
          </Link>
          <Link href="/app">
            <Button className="!py-2 text-[13px]">Open Ada</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Landing() {
  return (
    <>
      <IntroVeil />
      <ScrollProgress />
      <Nav />
      <main>
        {/* Hero — centered, editorial */}
        <section className="glow-field relative overflow-hidden">
          <div className="dot-grid absolute inset-0 -z-10" aria-hidden />
          <div className="mx-auto max-w-5xl px-5 pb-24 pt-36 text-center sm:pt-40">
            <Reveal>
              <p className="mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-xs text-muted shadow-card backdrop-blur">
                <span className="pulse-soft size-1.5 rounded-full bg-success" />
                An autonomous career agent — live now
              </p>
            </Reveal>
            <HeroHeadline />
            <Reveal delay={0.5}>
              <p className="mx-auto mt-8 max-w-xl text-balance text-lg leading-relaxed text-muted">
                One run: your CV rewritten for the role you want — in any industry —
                your best-fit jobs ranked, and a scored mock interview. No humans in
                the loop. Just Ada, working in minutes.
              </p>
            </Reveal>
            <Reveal delay={0.6}>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <Magnetic>
                  <Link href="/app/new">
                    <Button className="group !px-8 !py-4 text-base">
                      Start your run
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </Magnetic>
                <Link
                  href="/app/voice"
                  className="text-sm text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
                >
                  or talk to Ada first
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.7}>
              {/* One editorial line instead of a stat grid — the numbers live
                  inside the sentence, where they mean something. */}
              <p className="mx-auto mt-12 max-w-xl border-t border-line pt-6 text-balance text-sm leading-loose text-muted">
                Under <em className="display text-xl text-ink">three minutes</em> from
                payment to results. <em className="display text-xl text-ink">One</em>{" "}
                payment, no subscription.{" "}
                <em className="display text-xl text-ink">Zero</em> humans reading your
                CV.
              </p>
            </Reveal>
            <Reveal delay={0.35} className="mt-16">
              <HeroShowcase />
            </Reveal>
          </div>
        </section>

        {/* Every-career band */}
        <CareersBand />

        {/* Problem band — words brighten as you scroll through the statement */}
        <section className="bg-ink py-32 text-bg">
          <div className="mx-auto max-w-4xl px-5">
            <p className="eyebrow mb-6 !text-bg/50">The problem</p>
            <ScrubText
              className="display fluid-band leading-snug"
              segments={[
                {
                  text: "Job searching is a full-time job you didn’t apply for. Rewriting your CV for every role. Guessing what recruiters search for. Walking into interviews cold. Ada does all of it — in",
                },
                { text: "one run.", className: "text-accent italic" },
              ]}
            />
          </div>
        </section>

        {/* Deliverables — pinned scroll showcase on desktop, stacked on mobile */}
        <DeliverablesShowcase />

        {/* How it works */}
        <section id="how" className="scroll-mt-24 border-y border-line bg-surface py-28">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal>
              <Eyebrow>How it works</Eyebrow>
              <h2 className="display fluid-h2 mb-14">From CV to prepared, in five steps.</h2>
            </Reveal>
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.04}>
                  <div className="group border-t-2 border-line pt-5 transition-colors hover:border-accent">
                    <p className="display mb-3 text-4xl text-accent/80 transition-colors group-hover:text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                  </div>
                </Reveal>
              ))}
              <Reveal delay={0.2}>
                <div className="flex h-full flex-col justify-between rounded-card bg-accent-soft p-6">
                  <p className="display text-2xl text-accent">Ready when you are.</p>
                  <Link href="/app/new" className="mt-4">
                    <Button className="group">
                      Start a run
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-28">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="display fluid-h2 mb-4">Pay per run. Own the result.</h2>
              <p className="max-w-md text-muted">
                No subscription, no retainer, no career-coach hourly rate. One price, one
                complete run — itemised on the right, yours forever in your account.
              </p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
                A senior career coach charges more for one hour than Ada charges for the
                whole run — and Ada shows up in minutes, already knowing your background.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              {/* The run receipt — pay-per-run, itemised like the real thing */}
              <Card className="overflow-hidden !p-0 shadow-lift">
                <div className="flex items-center justify-between border-b border-dashed border-line px-7 py-4">
                  <span className="display text-lg">
                    Ada<span className="text-accent">.</span>
                  </span>
                  <p className="eyebrow !text-[10px]">Run receipt</p>
                </div>
                <ul className="px-7 py-5">
                  {RECEIPT_ITEMS.map(([item, value]) => (
                    <li key={item} className="flex items-baseline gap-2 py-1.5 text-sm">
                      <span className="text-ink">{item}</span>
                      <span
                        className="mx-1 flex-1 border-b border-dotted border-line"
                        aria-hidden
                      />
                      <span
                        className={
                          value === "included" ? "text-muted" : "font-medium text-accent"
                        }
                      >
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-dashed border-line px-7 py-6">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-muted">Total, one run</p>
                    <p className="display text-5xl">
                      ₦2,000
                      <span className="ml-2 text-base text-muted">/ $15</span>
                    </p>
                  </div>
                  <Link href="/app/new" className="mt-5 block">
                    <Button className="group w-full !py-3.5">
                      Run Ada now
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-muted">
                    Paystack for Nigeria · Stripe worldwide · Results in under 3 minutes
                  </p>
                </div>
              </Card>
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
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-lg text-muted transition-transform duration-200 group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
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
          <div
            className="absolute left-1/2 top-0 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl"
            aria-hidden
          />
          <Reveal className="relative">
            <h2 className="display fluid-hero mx-auto max-w-3xl px-5">
              Go in <em className="text-accent">prepared</em>.
            </h2>
            <p className="mx-auto mt-5 max-w-md px-5 text-balance text-bg/60">
              The next role is already out there. Ada gets you ready for it — whatever
              the industry.
            </p>
            <Magnetic className="mt-9">
              <Link href="/app/new" className="inline-block">
                <Button className="group !bg-bg !px-9 !py-4 text-base !text-ink !shadow-none hover:!opacity-90">
                  Start your run
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </Magnetic>
            <p className="mt-6 text-xs text-bg/50">
              ₦2,000 / $15 per run · No subscription · Results in minutes
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
    </>
  );
}
