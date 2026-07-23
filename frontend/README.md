# Ada frontend

Next.js 15 (App Router, TypeScript, Tailwind v4) — the landing page and the product.
All `/api/*` calls are proxied to the backend (`next.config.ts` rewrites), so the
session cookie is first-party and CORS never applies. The voice page connects straight
to the backend WebSocket (`NEXT_PUBLIC_WS_URL`) because rewrites don't carry upgrades.

## Routes

```
/                        landing: hero with live self-running demo, capability cards,
                         how-it-works, pricing, FAQs
/login                   magic-link request (no passwords)
/auth/verify             hands the emailed token to the backend via the proxy
/app                     auth-gated shell (sidebar) -> redirects to /app/runs
/app/new                 intake -> Paystack inline / Stripe redirect -> live progress
/app/runs                run history            /app/runs/[id]   CV + matches + questions
/app/runs/[id]/interview answer flow + scored feedback
/app/coach               Ask Ada — streaming chat grounded in profile + runs
/app/documents           every rewritten CV     /app/voice       spoken intake (Gemini Live)
/app/profile             LinkedIn profile import, sign out
```

## Structure

```
src/lib/api.ts           typed client for every backend endpoint + SSE chat reader
src/lib/paystack.ts      inline-checkout script loader
src/lib/audio.ts         mic -> 16 kHz PCM16 frames (inline AudioWorklet)
src/components/ui/       hand-built kit: Button, Card, ScoreBar, ThemeToggle, ...
src/components/app/      auth-gated shell (sidebar, mobile bar, useAuth)
src/components/run/      live run progress (mirrors the backend LangGraph stages)
src/components/marketing/ self-running hero demo + scroll reveals
src/app/globals.css      design tokens (light/dark), fluid type scale, prose styles
```

## Design system

Warm paper / near-black ink, single indigo accent, Instrument Serif display headlines
over Inter UI. Fluid `clamp()` type — no breakpoint jumps. Dark mode via class toggle
with pre-paint script (no flash). `prefers-reduced-motion` respected. No UI kit —
tokens in CSS custom properties, components in `src/components/ui`.

## Develop

```bash
pnpm install
pnpm dev            # http://localhost:3000, proxies to backend on :8080
BACKEND_URL=...     # optional; defaults to http://localhost:8080
```

## Verify / build

```bash
pnpm typecheck
pnpm build
```

## Deploy

Any Next.js host (e.g. Vercel). Set `BACKEND_URL` (server-side proxy target) and
`NEXT_PUBLIC_WS_URL` (public WebSocket origin, `wss://api.yourdomain`).
