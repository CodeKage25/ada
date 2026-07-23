import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { HeroDemo, Reveal } from "@/components/marketing/demo";
import { Button, Card, Logo, ScoreBar, ThemeToggle } from "@/components/ui";

const STEPS = [
  {
    title: "Tell Ada what you're going for",
    body: "Paste your CV and name the role — or just talk to her. A few minutes of voice intake is enough.",
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
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm text-muted max-sm:hidden">
          <a href="#how" className="rounded-full px-3 py-1.5 hover:text-ink">
            How it works
          </a>
          <a href="#pricing" className="rounded-full px-3 py-1.5 hover:text-ink">
            Pricing
          </a>
          <a href="#faqs" className="rounded-full px-3 py-1.5 hover:text-ink">
            FAQs
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
      <Nav />
      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-20 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <p className="mb-5 inline-block rounded-full border border-line px-3.5 py-1.5 text-xs text-muted">
                An autonomous career agent — live now
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="display fluid-hero">
                Meet Ada.
                <br />
                She gets you <em className="text-accent">hired</em>.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                One run: your CV rewritten for the role you want, your best-fit jobs
                ranked, and a scored mock interview. No humans in the loop — just Ada,
                working in minutes.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/app/new">
                  <Button className="!px-7 !py-3.5 text-base">
                    Start your run <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link href="/app/voice" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                  or talk to Ada first
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 text-xs text-muted">
                ₦2,000 / $15 per run · No subscription · Results in minutes
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="flex justify-center lg:justify-end">
            <HeroDemo />
          </Reveal>
        </section>

        {/* Problem band */}
        <section className="bg-ink py-24 text-bg">
          <div className="mx-auto max-w-4xl px-5">
            <Reveal>
              <p className="display fluid-band leading-snug">
                Job searching is a full-time job you didn&apos;t apply for.{" "}
                <span className="opacity-50">
                  Rewriting your CV for every role. Guessing what recruiters search for.
                  Walking into interviews cold.
                </span>{" "}
                Ada does all of it — in one run.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-6xl px-5 py-24">
          <Reveal>
            <h2 className="display fluid-h2 mb-12">One payment. Three deliverables.</h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal delay={0.05}>
              <Card className="h-full p-6">
                <div className="prose-ada mb-5 rounded-xl border border-line bg-bg p-4 text-[12px]">
                  <p className="font-semibold">Summary</p>
                  <p className="text-muted">
                    Backend engineer with 5 years building payment systems…
                  </p>
                  <p className="mt-2 font-semibold">Experience</p>
                  <p>
                    · Cut API p99 latency 43% by re-architecting the checkout path
                  </p>
                  <p>· Led idempotent payouts handling ₦2B+ monthly</p>
                </div>
                <h3 className="mb-1.5 font-semibold">CV rewrite, for the role</h3>
                <p className="text-sm leading-relaxed text-muted">
                  ATS-safe headers, recruiter vocabulary, duties turned into achievement
                  bullets. Your facts only — sharpened, never invented.
                </p>
              </Card>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="h-full p-6">
                <div className="mb-5 space-y-3 rounded-xl border border-line bg-bg p-4">
                  {[
                    ["Senior Backend Engineer", 92],
                    ["Platform Engineer", 87],
                    ["Engineering Manager", 81],
                  ].map(([title, score]) => (
                    <div key={title as string}>
                      <div className="flex justify-between text-[12px]">
                        <span className="font-medium">{title}</span>
                        <span className="text-accent">{score}%</span>
                      </div>
                      <div className="mt-1">
                        <ScoreBar value={score as number} />
                      </div>
                    </div>
                  ))}
                </div>
                <h3 className="mb-1.5 font-semibold">Matches that fit</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Semantic search over real roles — ranked by fit against your actual
                  experience, each with a reason, not just a keyword hit.
                </p>
              </Card>
            </Reveal>
            <Reveal delay={0.15}>
              <Card className="h-full p-6">
                <div className="mb-5 rounded-xl border border-line bg-bg p-4 text-[12px]">
                  <p className="text-muted">
                    “Tell me about a migration you led under time pressure.”
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <ScoreBar value={8} max={10} />
                    <span className="display shrink-0 text-base">8/10</span>
                  </div>
                  <p className="mt-2 text-muted">
                    Strong structure and metrics. Add the stakeholder conflict you
                    resolved.
                  </p>
                </div>
                <h3 className="mb-1.5 font-semibold">A scored mock interview</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Role-specific questions, then honest 0–10 scoring with feedback you can
                  use in the real room.
                </p>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-line bg-surface py-24">
          <div className="mx-auto max-w-6xl px-5">
            <Reveal>
              <h2 className="display fluid-h2 mb-12">From CV to prepared, in five steps.</h2>
            </Reveal>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.04}>
                  <p className="display mb-2 text-4xl text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mb-1.5 font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{step.body}</p>
                </Reveal>
              ))}
              <Reveal delay={0.2}>
                <div className="flex h-full flex-col justify-between rounded-card bg-accent-soft p-6">
                  <p className="display text-2xl text-accent">Ready when you are.</p>
                  <Link href="/app/new" className="mt-4">
                    <Button>
                      Start a run <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <Reveal>
              <h2 className="display fluid-h2 mb-4">Pay per run. Own the result.</h2>
              <p className="max-w-md text-muted">
                No subscription, no retainer, no career-coach hourly rate. One price, one
                complete run, yours forever in your account.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "CV rewrite + ranked matches + scored interview — all included",
                  "Ask Ada: unlimited coaching chat, grounded in your profile",
                  "Failed runs are never charged",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <Card className="p-8">
                <p className="text-sm font-medium text-muted">One run</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="display text-6xl">₦2,000</span>
                  <span className="text-muted">/ $15 international</span>
                </div>
                <p className="mt-4 text-sm text-muted">
                  Paystack for Nigeria · Cards worldwide via Stripe
                </p>
                <Link href="/app/new" className="mt-6 block">
                  <Button className="w-full !py-3.5">
                    Run Ada now <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <p className="mt-3 text-center text-xs text-muted">
                  Results typically land in under 3 minutes.
                </p>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* FAQs */}
        <section id="faqs" className="border-t border-line bg-surface py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[1fr_2fr]">
            <Reveal>
              <h2 className="display fluid-h2">FAQs.</h2>
            </Reveal>
            <div className="divide-y divide-line">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.q} delay={i * 0.03}>
                  <details className="group py-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                      {faq.q}
                      <span className="text-xl text-muted transition-transform group-open:rotate-45">
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
        <section className="bg-ink py-24 text-center text-bg">
          <Reveal>
            <h2 className="display fluid-h2 mx-auto max-w-2xl px-5">
              The next role is already out there. Go in prepared.
            </h2>
            <Link href="/app/new" className="mt-8 inline-block">
              <Button className="!bg-bg !px-8 !py-4 text-base !text-ink hover:!opacity-90">
                Start your run <ArrowRight className="size-4" />
              </Button>
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted">
          <Logo className="text-base" />
          <p>Ada is an autonomous agent — no human reads your CV.</p>
          <p>© {new Date().getFullYear()} Ada</p>
        </div>
      </footer>
    </>
  );
}
