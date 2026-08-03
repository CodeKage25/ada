# Ada + Uche — Production Implementation Brief for Claude

> **How to use this file:** Use this document as Claude Code's implementation contract for the existing repository. Do not create a parallel prototype, optimize only for a demo, or stop at screens backed by placeholder state. The objective is a production-credible, end-to-end career marketplace whose claims are supported by persisted state, explicit authorization, durable execution, observable providers, tested migrations, and honest fallbacks.

---

## 0. Production mission

You are the principal engineer, product architect, UX lead, AI safety reviewer, and demo owner for **Ada + Uche**.

The product thesis is:

> **Ada helps African professionals move from “I need a better job” to a concrete interview. Uche helps employers move from “I need a great person” to a qualified, consented conversation.**

Ada is the candidate career agent. Uche is the employer hiring room. Together they form a consent-first, evidence-backed career marketplace rather than another generic CV writer, job board, chatbot, or opaque AI ranking tool.

Your implementation must make this loop obvious, fast, beautiful, measurable, and safe:

```text
Candidate defines a Career Mission
  → Ada understands the candidate and creates evidence-backed recommendations
  → Opportunity Radar finds fresh, explainable roles
  → Candidate reviews, gives feedback, and approves an action
  → Ada prepares a truthful application or warm introduction
  → Uche gives the employer an explainable shortlist
  → Candidate consents to and accepts a conversation
  → Both sides use a Hiring Room to progress toward interview, offer, or hire
  → Outcomes improve future recommendations
```

### End-to-end success criteria

The finished product slice must let a real user complete the following journey, and the same journey should remain concise enough to demonstrate in under five minutes:

1. A candidate starts from a CV or free CV assessment.
2. Ada identifies strengths, gaps, preferences, and a target role.
3. The candidate creates or confirms a Career Mission.
4. Ada shows a small, high-quality Opportunity Radar with **why this matches** explanations.
5. The candidate reviews an application packet before any external submission.
6. An employer switches to Uche, posts a role, and sees consented candidates ranked by evidence rather than keywords alone.
7. The employer requests an intro; the candidate accepts; the conversation appears in the shared thread.
8. The Hiring Room records the next action and a credible path to an interview.
9. Refreshing, signing out and back in, retrying a request, or restarting an app instance does not lose or duplicate accepted state.
10. Provider quota, timeout, missing embeddings, stale jobs, and unsupported ATS flows produce truthful degraded states rather than false scores, false submission claims, or failed paid runs.

The production path must never depend on a provider being healthy to preserve user data or explain what happened. A clearly isolated local/demo mode may use deterministic fixtures, but production code must never fake a payment, verification result, employer, application submission, interview, offer, or hire.

### Product quality bar

The result must feel:

- **Distinctive:** calm, premium, warm, editorial, and intentional—not a generic dashboard template.
- **Trustworthy:** every AI-derived claim is clearly distinguished from verified evidence.
- **Useful:** every major screen has one clear next action.
- **Fast:** use progressive loading, partial results, optimistic updates only where safe, and graceful provider failures.
- **Inclusive:** excellent keyboard, screen-reader, mobile, low-bandwidth, and reduced-motion behavior.
- **Defensible:** candidate consent, explainability, outcome feedback, local market context, and two-sided liquidity are first-class concepts.

Do not add features merely because they sound impressive. Prioritize the smallest coherent set that makes the core loop work end to end.

### Definition of production-ready

A phase is not complete until all of the following are true:

- The database is the source of truth for state that must survive a request or process restart.
- Every user-owned read and write has an explicit ownership or role check.
- Mutations define validation, idempotency, concurrency, retry, and rollback behavior.
- External side effects distinguish `requested`, `attempting`, `confirmed`, `needs_attention`, and `failed`; only provider evidence can produce a confirmed state.
- AI and embedding calls have bounded inputs, attempts, timeouts, cost, and an honest fallback.
- New schema has an append-only migration, constraints, indexes, downgrade behavior, and DB-backed tests.
- Web and mobile clients use typed contracts and render loading, empty, degraded, partial, error, unauthorized, offline, and retry states.
- Public route or response changes are additive unless explicitly approved and documented.
- Applicable verification commands have actually passed; blocked checks include the exact command and error.

---

## 1. Read this first: repository context and hard constraints

Before editing anything:

1. Read `AGENTS.md` and `Claude.md`.
2. Run `git status --short` and preserve unrelated user changes.
3. Inspect the current diff and the latest commit.
4. Read `README.md`, `backend/README.md`, and `docs/GO-LIVE.md`.
5. Read the protected money-path specification at `backend/features/money_path.feature`.
6. Map the actual route, model, repository, service, migration, frontend, and mobile trees. Do not trust this brief over the code if they differ.

### Protected paths — never modify

- `backend/features/**`
- `backend/tests/acceptance/**`
- `backend/quality/**`
- `backend/scripts/**`
- `backend/.importlinter`
- `backend/pyproject.toml`
- `Makefile`
- `AGENTS.md`
- `.github/**`

Allowed implementation areas are primarily:

- `backend/src/**`
- `backend/tests/**`, except acceptance tests
- Append-only Alembic revisions under `backend/migrations/versions/**`
- `frontend/src/**`
- `mobile/src/**`

If the correct solution needs a protected-file change, stop and report the exact change required. Do not lower a threshold, delete a scenario, weaken a check, or work around the protection.

### Required verification contract

Backend requires Postgres:

```bash
make up
make fast
RUN_DB_TESTS=1 make verify
```

Frontend:

```bash
cd frontend
pnpm typecheck
pnpm build
```

Mobile:

```bash
cd mobile
npx tsc --noEmit
```

Never claim a command passed unless it actually exited successfully. If infrastructure prevents a check, report the exact command and error.

### Non-negotiable money-path invariants

Preserve all of these exactly:

1. Verify webhook signature first.
2. Verify the charge/payment out of band with the provider.
3. Check amount and currency against the run.
4. Claim the payment event and move `PENDING_PAYMENT → PAID` in one transaction.
5. Move `PAID → RUNNING` through an atomic update.
6. Replay of an already-claimed event is a no-op.
7. An unpaid run cannot execute.
8. Concurrent workers cannot execute one paid run twice.
9. Matching request paths read the local jobs table only; never call an external job API in a request path.

### Coding and security rules

- Do not store secrets in code or commit `.env` files.
- Do not trust client claims for payment, entitlement, timer, identity, verification, application status, or authorization.
- Use ownership checks on every user-owned resource.
- Use typed validation and bounded inputs.
- Do not add bare `# type: ignore` or bare `# noqa`.
- Do not add `# pragma: no cover`, skip/xfail tests, empty tests, or `assert True`.
- Prefer clear code over comments; add a one-line docstring only when a non-obvious contract needs recording.
- Never expose CV text, chat transcripts, assessment answers, KYC inputs, ID numbers, tokens, secrets, or proctoring frames to analytics.
- Never imply that self-attestation is equivalent to government-ID verification.
- AI may propose, transform, summarize, and explain; it must not invent candidate facts.
- Consequential actions must use preview → explicit confirmation → execution → audit/result.

---

## 2. Current product to preserve and connect

Confirm these against the repository before implementation. Do not remove working behavior or deep links.

### Candidate/Ada surfaces

- Email/password auth, sessions, reset flow
- Candidate/employer account mode
- Profile and document management
- Free public CV assessment and extraction
- Paid or entitled runs through Paystack/Stripe
- Voice intake and voice coaching
- AI CV rewrite, job matching, and interview preparation
- Ask Ada streaming chat, chat history, and memories
- Candidate insights and employer-discovery consent
- Identity attestation and optional KYC adapter
- Written and voice/video role assessments with integrity telemetry
- Applications, retry/attention states, and outcome pipeline
- Employer intros and accepted-intro messaging
- In-app, email, WhatsApp, and Web Push notifications
- Candidate billing/subscription

### Employer/Uche surfaces

- Employer landing and pricing
- Employer console and company profile
- Role posting and shared job pool
- Role embeddings and AI-curated candidate shortlist
- Consent-based talent search
- Shortlist stages and notes
- Intro requests, responses, and messaging
- Employer billing and overview metrics
- Public company page

### Operational surfaces

- Admin metrics, users, runs, payment events, audit, ingest, embedding, broadcasts
- Recovery tooling and structured observability
- Postgres/pgvector, Alembic, provider adapters, and Cloud Run-oriented deployment

### Confirmed issues to investigate, not blindly assume

#### A. The candidate home is too run-centric

`frontend/src/app/app/page.tsx` and `mobile/src/app/(tabs)/index.tsx` show run counts, the latest run, and Ask Ada, but not a persistent job-search mission, next-best actions, follow-ups, pending intros, application attention, or outcome momentum.

#### B. The current match contract can mislead users

Inspect `backend/src/ada/services/search.py` and all consumers. If keyword fallback returns `match: None` while the UI renders a percentage, correct the contract additively. A keyword result must not look like a semantic confidence score.

Recommended additive shape:

```json
{
  "match": 72,
  "score_type": "semantic|keyword|hybrid",
  "confidence": "high|medium|low",
  "reason": "...",
  "criteria": [],
  "freshness": null
}
```

For keyword fallback, use `match: null` plus a clear “Keyword match — low confidence” UI, or introduce a separately documented ordinal value. Do not fabricate comparability.

#### C. Identity is represented as an ambiguous boolean

Inspect profile, verification, employer cards, admin views, and serializers. Use explicit assurance semantics such as:

- `unverified`
- `self_attested`
- `document_checked`
- `government_id_verified`

Persist provider/method and timestamps only as necessary. Migrate old rows deterministically and preserve old fields during a compatibility period if required.

#### D. Critical work uses request-process background tasks

Search all `BackgroundTasks` call sites. Classify work as durable-critical, retryable, or disposable. At minimum, assess runs, applications, ingestion/embeddings, and broadcasts. Do not introduce a large new infrastructure dependency without proving why the existing deployment cannot support it.

#### E. Uche needs a real hiring workflow

Employer role intake, candidate cards, shortlist, intros, and messaging exist, but a role lifecycle, structured scorecard, evidence comparison, scheduling, interviewer feedback, team permissions, and hiring decision log are not yet a complete Hiring Room.

#### F. Applications need candidate control

Inspect `backend/src/ada/api/routes/applications.py` and the ATS service. Add a reviewable, versioned application packet and explicit approval policy before expanding automation. Preserve conservative submission confirmation and retries.

#### G. The standing jobs feed is an initial inbox, not yet an Opportunity Radar

The repository now includes `GET /api/jobs/feed`, `POST /api/jobs/{id}/triage`, `GET /api/jobs/tracked`, a `job_interactions` table, and a web jobs page. Treat this as a foundation that must be hardened rather than declared complete. Inspect and fix:

- The feed currently tunes from the latest run or profile headline, not an explicit persisted Career Mission.
- Keyword OR matching is relevance filtering, not a candidate-specific rank or confidence score.
- Cursor pagination and total-count semantics must remain stable under concurrent ingestion and triage.
- Triage needs DB-backed idempotency, ownership, allowed-action constraints, timestamps that update on re-triage, and error recovery in clients.
- The web currently performs optimistic removal and swallows mutation failures; failed writes must rollback or visibly offer retry.
- The modal needs focus management/restoration and must ignore single-key shortcuts while focus is in an interactive control.
- Mobile has no equivalent opportunity feed/triage surface yet.
- Job freshness, source, apply capability, suspicious-listing reporting, reasoned dismissal, and stale-corpus states are not yet represented.

#### H. Recent run hardening is necessary but not durable execution

Quota-safe run execution, retry metadata, admin retry, and recovery are useful. Verify their migrations and tests, but do not confuse them with a durable task queue. Request-scoped `BackgroundTasks` can still be lost between commit and dispatch or during instance termination. Preserve atomic run claims and recovery while designing the smallest durable dispatch mechanism.

---

## 3. Execution protocol

### Step 1 — Audit before implementation

Produce an internal audit covering:

- Actual routes and response shapes
- Entity relationships and state machines
- Candidate, employer, admin, payment, notification, and mobile journeys
- Provider dependencies and failure modes
- Security/privacy boundaries
- Current test and build gates
- Exact gaps blocking the core loop
- Proposed minimal vertical slice
- Files, migrations, tests, and risk for each phase

Then begin implementation in the phases below. Do not rewrite the entire app and do not create a parallel mock product.

### Step 2 — Establish a phase checklist

For every phase, record:

- Goal
- User-visible outcome
- Backend contract
- Data/migration impact
- Frontend/mobile impact
- Tests
- Rollback/compatibility plan
- Verification results

Keep the checklist updated in the response or in an unprotected planning document if one already exists. Do not modify `AGENTS.md`, protected specs, or quality files.

### Step 3 — Implement backend contract first

Add or change domain models, repositories, services, routes, serializers, and migrations in that order. Every new endpoint needs ownership, validation, authorization, error, and idempotency behavior defined before UI work.

For each vertical slice, use this exact implementation sequence:

1. Define domain states, transitions, invariants, and public response shape.
2. Add an append-only migration with constraints and indexes.
3. Implement repository methods and transaction/concurrency semantics.
4. Implement provider-independent service policy and deterministic fallback.
5. Add authenticated routes with bounded Pydantic models.
6. Add unit, repository/DB, concurrency, and HTTP authorization tests.
7. Update the typed web client and complete web states.
8. Update the typed mobile client and only the required mobile surface.
9. Add recovery/admin visibility for durable or externally-effectful work.
10. Run focused checks, then the required gates.

Do not move on because an endpoint returns 200 or a page renders. Move on only when state persists correctly, duplicate/concurrent requests are safe, unauthorized access is denied, failure is visible and recoverable, and client contracts are synchronized.

### Step 4 — Add tests before broad UI polish

Use deterministic fakes for AI and external providers. Test success, empty, stale, provider failure, retry, duplicate request, unauthorized access, and concurrent access.

### Step 5 — Build the web demo path

Use the existing design system and visual language. Favor a coherent narrative and excellent states over many disconnected pages. Keep all responsive behavior polished at mobile widths.

### Step 6 — Add only high-frequency mobile slices

Prioritize mobile actions that make the demo and product meaningfully better: opportunity triage, intro response, application attention, interview preparation, notifications, and Ask Ada. Do not duplicate every admin/employer web screen in mobile.

### Step 7 — Run gates and self-review

Before declaring a phase complete, review:

- Readability
- Modularity
- Testability
- Domain boundaries
- Authorization and privacy
- AI factuality and provenance
- Accessibility
- Loading/error/empty/offline behavior
- Performance and idempotency
- Public API compatibility

Run the applicable checks and report exact results.

---

## 4. Build order: foundation first

Implement the following in order. Do not jump to Phase 2 marketplace features while Phase 0 trust foundations are red.

---

## Phase 0 — Trust, correctness, and demo reliability

### 0.1 Match-result contract

Audit and fix semantic, keyword, and hybrid match results across:

- Backend search service
- Run result serializers
- Candidate home/latest run
- Run detail/results
- Job cards and preview surfaces
- Mobile matching surfaces
- Employer shortlist and talent cards

Acceptance criteria:

- No UI can render `null%`, `undefined%`, NaN, or an unqualified score.
- Every result identifies score type and confidence.
- Keyword fallback has an honest distinct label.
- Missing data is shown as unknown, not failed.
- Existing consumers remain backward-compatible where possible.
- Tests cover semantic, keyword, empty corpus, malformed provider output, and mixed results.

Required implementation detail:

- Introduce a typed backend result model rather than `list[dict]` at the service/route boundary.
- Preserve `match` for compatibility, but make it `number | null` in every client.
- Add `score_type` and `confidence` to every result. Semantic results may include a bounded percentage; keyword results must use `match: null`.
- Audit candidate web home, run detail, mobile home, mobile run detail, digest rendering, admin/debug output, and employer surfaces before considering this complete.
- Do not catch all exceptions indefinitely. Classify quota/transient/provider errors for degradation; surface programming/data-contract errors to tests and observability.

### 0.2 Identity assurance

Implement explicit assurance levels and honest UI labels. Do not use a single boolean to imply equivalent trust.

Acceptance criteria:

- Self-attested and government-ID verified are visibly different.
- Old data is migrated deterministically.
- Employers cannot view sensitive identity inputs.
- Candidate can see and control the credential’s public visibility.
- Method/provider/timestamps are not overexposed.
- Cross-account access tests pass.

### 0.3 Durable execution assessment

Inventory every `BackgroundTasks` call. For each, document whether it is disposable or needs durable execution. Implement the smallest safe durable task abstraction for critical work if feasible within the current deployment.

Each durable task must have:

- Explicit type and version
- Idempotency key
- State and attempts
- Lease/claim timeout
- Backoff and retry limit
- Permanent failure/dead-letter state
- Correlation ID
- Safe duplicate delivery
- Admin/recovery visibility

Do not change webhook ordering or payment transaction boundaries.

Migration safety is part of this phase. Confirm the live Alembic graph has one head, every new ORM table/column has an applied revision, migration ordering works from an empty database and the previous production revision, and downgrades remove dependent indexes/constraints safely. Never edit an already-released revision to repair a later feature; append a new revision.

### 0.4 Safety, privacy, and cost controls

Audit and improve:

- Rate limits for public assessment, auth, chat/voice, runs, applications, intros, messages, KYC, assessments, job posting, search, and push
- AI timeout/retry/circuit-breaker behavior
- Provider kill switches
- Maximum input/output/token/cost bounds
- Sensitive-data logging
- Security headers and CORS/CSRF behavior
- Data retention and cleanup for guest runs, snapshots, documents, chat, memories, and application artifacts

Do not invent legal compliance claims. Document unresolved policy decisions.

### 0.5 Demo readiness

Create a repeatable, safe demo setup using existing local seed mechanisms or additive demo fixtures. The demo must show:

- One candidate with a credible profile, CV, mission, match, and interview state
- One employer with a role and shortlist
- One consented candidate
- One pending/accepted intro path
- Clearly labeled demo/test data

Do not fake payment confirmation or alter acceptance specifications.

---

## Phase 1 — Career Mission and Opportunity Radar

### 1.1 Career Mission domain

Add an append-only migration if needed. A mission should support:

- Role family/target roles
- Location, country, timezone
- Remote/hybrid/onsite
- Compensation floor/range/currency
- Work authorization/sponsorship
- Notice period/availability
- Seniority
- Must-have and transferable skills
- Excluded companies/industries
- Weekly application/conversation goal
- Application policy: `draft_only`, `approval_required`, `auto_apply_within_rules`
- Status: `draft`, `active`, `paused`, `completed`, `archived`
- Profile/CV version association
- Created, updated, last-reviewed, and paused timestamps

Rules:

- Candidate owns the mission.
- A candidate can have one active mission initially; design for multiple later.
- Updates are validated server-side.
- Ranking must not silently use stale preferences.
- A mission can be paused without deleting history.

### 1.2 Candidate home as a progress cockpit

Improve `frontend/src/app/app/page.tsx` and the mobile home so the first viewport answers:

- What should I do next?
- What new opportunity appeared?
- What needs my attention?
- Am I making progress?

Add:

- Mission summary and freshness
- Next-best-action queue
- Apply-now opportunities
- Warm intros
- Application attention
- Interview/follow-up reminders
- Outcome momentum
- Existing runs as supporting work, not the entire product

Preserve existing run links and states.

### 1.3 Opportunity Radar

Build a local job feed with explicit ranking explanations:

- Match type and confidence
- Hard-constraint status
- Skills matched and missing
- Location/work-mode fit
- Compensation fit or unknown
- Freshness
- Source and application capability
- Saved/dismissed/applied/introduced state
- Why this role
- What would improve the candidate’s odds

Feedback actions:

- Interested/save
- Not interested
- Wrong level
- Wrong location
- Below compensation
- Wrong function
- Already applied
- Report suspicious listing

Acceptance criteria:

- Ranking reads the local jobs table only.
- Candidate-specific private data is not exposed to employers.
- Feedback is idempotent and attributable.
- Empty, stale, and provider/embedding failure states are useful.
- Feed is responsive and keyboard accessible.

Production implementation requirements:

- Start from the existing `JobInteraction`/feed foundation and evolve it additively; do not create a second incompatible saved-job system.
- Add a database check constraint or enum for feedback action, a deterministic conflict target, and an `updated_at` or immutable event history so re-triage timing is truthful.
- Define a stable cursor from the actual sort key. If freshness ranks by `(posted_at, id)`, encode both values; do not use `id` as a proxy for freshness without documenting that limitation.
- Separate `items returned`, `remaining untriaged count`, and `next_cursor`. Never let optimistic UI counts become negative.
- Rank only after applying hard mission constraints. Return an explanation object, not just prose.
- Expose corpus freshness and a degraded-reason code when ranking falls back because embeddings or provider quota are unavailable.
- Web and mobile mutations must disable duplicate actions, surface server errors, and rollback or refetch after failed optimistic updates.
- Dialogs must trap focus, restore focus, have a labelled close action, and limit keyboard shortcuts to non-editing contexts.
- Add DB tests for two users triaging the same job independently, duplicate triage, re-triage, pagination without duplicates, missing jobs, invalid actions, and concurrent ingestion.

---

## Phase 2 — Apply Control Center and Interview Room

### 2.1 Apply Control Center

Implement an auditable application packet containing, as appropriate:

- Job and employer
- CV/profile version
- Cover note
- Generated answers
- Source/provenance per answer
- Unknown or candidate-required fields
- ATS/provider and external URL
- Approval policy and confirmation timestamp
- Attempt history and failure category
- Current status
- Retry/handoff action
- Follow-up date
- Outcome link

Modes:

1. Draft only
2. Require candidate approval
3. Auto-apply only inside explicit mission rules

Acceptance criteria:

- No submission occurs without an authorized policy.
- The candidate can inspect the exact payload before approval.
- Duplicate apply is idempotent.
- Failure gives a useful handoff path.
- Sensitive artifacts have retention rules.
- Existing ATS safety behavior remains conservative.

### 2.2 Interview Room

Create a role-specific workspace containing:

- Role/company context
- Extracted requirements
- Candidate evidence map
- Missing evidence/gaps
- Approved story bank
- STAR answer builder
- Generated questions with rubric provenance
- Written mock interview
- Voice rehearsal where supported
- Feedback and next practice action
- Post-interview follow-up draft

Keep private notes private. Use preview/confirm before storing new memories or sending messages.

---

## Phase 3 — Talent Passport, Evidence Lab, and explainable Uche

### 3.1 Talent Passport

Create candidate-controlled claims backed by evidence. Every claim needs:

```text
claim
source
source_type
confidence
verification_level
verified_at
expires_at
candidate_confirmed_at
visibility
```

Inferred, candidate-confirmed, document-backed, assessment-backed, and employer-observed claims must remain distinguishable.

### 3.2 Evidence Lab

Support modular evidence:

- Skill assessment
- Work sample
- Portfolio
- Certification
- Reference
- Identity assurance
- Employment history
- Communication simulation

Add visibility, expiry, renewal, candidate-request approval, appeals, and accessible alternatives. Proctoring must be consented, bounded, and never treat an accommodation as evidence of dishonesty.

### 3.3 Uche Hiring Room

Improve employer workflow beyond a shortlist:

- Role lifecycle: draft, active, paused, closed, archived
- Structured scorecard
- Must-have/preferred/trainable/disqualifying criteria
- Criterion-level evidence and uncertainty
- Side-by-side candidate comparison
- Saved candidates by role
- Intro state and message thread
- Interview plan and scheduling boundary
- Structured interviewer feedback
- Decision log
- Offer/hire outcome
- Funnel analytics

Before adding team seats, model company/organization, membership, billing owner, roles, and data isolation cleanly. Do not permanently couple all employer data to one `User` row if the architecture needs to evolve.

---

## Phase 4 — Marketplace liquidity, distribution, and learning

Only implement these after the core candidate/employer loop is reliable and measured:

- Signed, expiring WhatsApp actions for save/dismiss/intro response/follow-up
- Personalized daily career briefing
- Employer alerts for newly matching consented candidates
- Candidate and employer referrals with consent/attribution
- One high-value ATS export/integration
- Outcome events for interview, offer, hire, and rejection reasons
- Anonymized market intelligence with small-cell protection
- University/bootcamp cohorts
- Remote/diaspora workflows: timezone overlap, sponsorship, contractor context

Do not add an unmoderated social community just to increase feature count.

---

## 5. AI implementation standards

For every AI capability:

1. Define the input contract and maximum size.
2. Define the structured output schema.
3. Validate output server-side.
4. Record model/prompt/rubric version and latency/cost metadata.
5. Store provenance for derived claims.
6. Distinguish known, candidate-confirmed, inferred, and unknown.
7. Retry only bounded/transient failures.
8. Never allow provider output to override authorization or business state.
9. Protect against prompt injection in CVs, job descriptions, messages, and external pages.
10. Add deterministic offline fixtures; do not call live providers in ordinary unit tests.

Create evaluation fixtures for:

- CV factuality and preservation of dates/employers/metrics
- No invented education, employers, skills, or achievements
- Match precision@5 and hard-constraint compliance
- Salary/location/work-mode/seniority filtering
- Interview relevance and score consistency
- Structured output validity
- Prompt-injection resistance
- Cost and latency budgets

An AI score is not a truth claim. UI copy must say what the score means and what it does not mean.

---

## 6. Analytics, observability, and KPIs

Add a typed, privacy-safe internal event interface with allowlisted properties. Never include raw CVs, chat/voice content, assessment answers, KYC fields, IDs, tokens, secrets, or raw notes.

Track server-authoritative events with deduplication:

- Assessment started/completed
- Signup/profile/CV activation
- Mission created/activated/paused
- Match viewed/saved/dismissed with reason
- Application drafted/approved/submitted/failed/attention
- Intro requested/accepted/declined/message sent
- Interview started/completed
- Offer/hire/rejection outcome
- Employer role created/activated/paused/closed
- Candidate shortlisted/saved/contacted
- Checkout started/succeeded/cancelled
- Subscription activated/cancelled

Primary north-star metric:

> **Qualified employer–candidate conversations per active role per week.**

Guardrails:

- Candidate decline rate
- Employer rejection rate after first review
- Scam/report rate
- Incorrect-application rate
- Verification disputes
- Opt-out rate
- Response time
- Cost per qualified conversation
- Intro-to-interview and interview-to-offer conversion

Add dashboards or admin-readable aggregates only after the event contract is stable.

---

## 7. Security, privacy, and operational requirements

Audit and improve:

- CSRF, SameSite, CORS, origin checks, session rotation, logout
- Security headers and a deliberate production CSP
- Rate limits and abuse controls
- Resource ownership and cross-tenant isolation
- Provider timeouts, retries, circuit breakers, and kill switches
- Idempotency for payments, tasks, applications, intros, messages, notifications, and feedback
- Data export and deletion propagation
- Retention/expiry for guest runs, CVs, documents, memories, chat, assessment answers, snapshots, and application artifacts
- Audit trail for admin and consequential candidate/employer actions
- Safe logging and redaction
- Webhook replay and provider outage behavior
- Background task crash and recovery behavior

Do not describe the product as legally compliant, bias-free, or identity-verified in an absolute sense without evidence and reviewed policy.

---

## 8. UX and design direction

Use the existing design system rather than replacing it. The visual direction should feel like a calm, premium career studio:

- Strong typographic hierarchy
- Serif/display moments paired with readable sans text
- Warm neutral surfaces and a restrained accent
- Generous spacing and clear grouping
- Editorial cards instead of dense enterprise chrome
- One clear primary action per state
- Thoughtful empty/error/loading/success states
- Subtle motion with reduced-motion fallback
- No fake real-time animations or fake numbers

Every new screen must include:

- Loading state
- Empty state
- Error state with recovery action
- Stale/offline state where relevant
- Keyboard focus states
- Accessible names and labels
- Mobile layout
- Confirmation for destructive or consequential actions

For the hackathon demo, optimize the first 60 seconds of each role:

### Candidate demo script

```text
Open Ada → paste/upload CV → choose “Senior Product Manager”
→ confirm mission constraints → see three explainable matches
→ open one role → review truthful application packet
→ approve draft or request warm intro → see next action
```

### Employer demo script

```text
Switch to Uche → post “Senior Product Manager” with scorecard
→ see consented shortlist → inspect evidence and confidence
→ request intro → switch to candidate → accept
→ open shared thread/Hiring Room → schedule or prepare interview
```

Make both scripts recoverable if a provider or background worker is unavailable.

---

## 9. Testing requirements

### Backend

- Unit tests for policies, ranking, assurance levels, provenance, task claims, and action authorization
- Repository tests for constraints, ownership, migrations, and idempotency
- Concurrency tests for payment/run/application/task/intro claims
- HTTP tests for status codes and response shapes
- Security tests for cross-account and cross-employer access
- Sensitive-data leakage tests
- AI fixture tests with deterministic fakes
- Recovery and retry tests

Do not edit acceptance tests. If an acceptance test fails, fix implementation or report a genuine spec problem.

### Frontend

- `pnpm typecheck`
- `pnpm build`
- Test/verify candidate and employer core journeys
- Verify no `null%`, false verification badge, stale data presented as current, or silent submission
- Check keyboard navigation, focus, labels, responsive layouts, and reduced motion
- Verify API types and response shapes do not drift

### Mobile

- `npx tsc --noEmit`
- Verify auth/session, deep links, retry/error states, notification actions, intro responses, opportunities, applications, and interview flows
- Avoid storing sensitive server data insecurely in local persistence

### Final gate

Run, where environment permits:

```bash
make up
make fast
RUN_DB_TESTS=1 make verify
cd frontend && pnpm typecheck && pnpm build
cd ../mobile && npx tsc --noEmit
```

Report exact output, including any command that could not run.

---

## 10. Deliverables for every implementation phase

For each phase, report:

1. Goal and user-visible value
2. Exact files changed
3. Migrations added, if any
4. New/changed routes and response shapes
5. State-machine changes
6. Tests added or updated
7. Security/privacy implications
8. AI provenance/evaluation implications
9. Performance/reliability implications
10. Compatibility and rollback plan
11. Exact verification commands and results
12. Remaining risks and assumptions

At the end, provide:

- Executive summary
- What a judge can demo
- What is production-ready versus demo-only
- Public API changes
- Protected-path changes requested but not made
- Surviving mutants and why they remain, if applicable
- The next highest-leverage phase

---

## 11. Final instruction to Claude

Do not optimize for the number of screens, endpoints, or AI features. Optimize for one unforgettable, truthful, end-to-end outcome:

> A real candidate understands their value, finds a real opportunity, takes a controlled next step, and reaches a qualified employer conversation faster—with evidence and consent visible at every important point.

Start by inspecting the repository and producing the audit/implementation plan. Then implement Phase 0 and the smallest complete vertical slice of Phase 1. Keep the existing money path green. Do not stop at a mock UI, and do not claim completion without running the required gates.