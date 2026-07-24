# Ada

An autonomous career agent. A user pays once and Ada runs the full loop end to end —
no human in the workflow:

**intake (typed or voice) → ATS CV rewrite → job matching → mock interview → scored feedback**

Plus an always-on side: email + password accounts, an imported LinkedIn career profile, and
**Ask Ada** — a streaming coaching chat grounded in the user's profile and run history.

## Monorepo

```
backend/    FastAPI + LangGraph agent on Gemini/Vertex, Postgres+pgvector, Alembic,
            Paystack + Stripe, email+password auth, SSE chat    -> backend/README.md
frontend/   Next.js 15 app: landing page + product (runs, interview, coach,
            voice intake, profile)                              -> frontend/README.md
```

Independent deploys via path-filtered CI (`.github/workflows/ci.yml`): the backend job
runs ruff + Alembic + pytest against real pgvector Postgres; the frontend job typechecks
and builds.

## The paid loop

```
POST /api/runs (cv + role, provider)   ->  pending run + payment init
  paystack -> inline checkout              stripe -> hosted checkout redirect
payment succeeds -> provider webhook
/api/webhooks/{paystack|stripe}        ->  authenticate signature
                                       ->  confirm charge out of band
                                       ->  reject wrong amount / currency
                                       ->  claim event once + mark run PAID (one tx)
                                       ->  dispatch agent (background)
LangGraph: cv_rewrite -> job_match -> interview_prep
GET /api/runs/{id}                     ->  cv + matches + questions
POST /api/runs/{id}/interview          ->  scored feedback
```

**Payment integrity.** A webhook signature only proves the sender; amount and success are
confirmed out of band (Paystack verify API, Stripe event fields) before anything executes.

**Exactly-once.** Event claim + `PENDING_PAYMENT → PAID` happen in one transaction;
execution takes `PAID → RUNNING` atomically. Replays and concurrent workers cannot
double-charge or double-run. `python -m ada.recover` re-dispatches crash-orphaned runs.

## Run it locally

```bash
# infra
docker compose up -d              # postgres + pgvector

# backend  (http://localhost:8080)
make install                      # backend deps into your env
cp backend/.env.example backend/.env    # keys: Paystack, Stripe, GCP project
make migrate && make seed
make dev

# frontend (http://localhost:3000 — proxies /api to the backend)
cd frontend && pnpm install && pnpm dev
```

Local auth needs no email provider — sign up with any email + password, and password-reset
links are printed in the backend logs instead of sent.

## Verification

```bash
make lint && make test            # backend: ruff + pytest (DB tests need RUN_DB_TESTS=1)
cd frontend && pnpm typecheck && pnpm build
```

## Deploy

Backend: Cloud Run (`make deploy`; secrets from Secret Manager; run
`alembic upgrade head` as a release step). Frontend: any Next.js host (e.g. Vercel) with
`BACKEND_URL` pointing at the API and `NEXT_PUBLIC_WS_URL` at its WebSocket origin.
Staging/prod boot fails fast unless payment, email (Resend), and origin config are set —
see `backend/src/ada/config.py::validate_runtime`.
