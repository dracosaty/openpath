# OpenPath

AI-guided learning platform. Type any topic → answer 3 calibration questions →
get a personalised roadmap with per-node lessons (text, diagrams, quizzes, and
"go deeper" branches).

This repo is the productionized version of an original single-file HTML/React
prototype (kept outside this repo). It splits that bundle into a proper
**Vite + React + TypeScript** app and adds a thin serverless backend so the
Anthropic API key is never exposed to the browser.

> **Build status:** Phase 1 complete — repo restructure, server-side Anthropic
> proxy, Supabase-backed cache + rate limiting, auth + persistence, and the
> per-node feedback hook. Proctoring and blockchain credentials are intentionally
> descoped to "coming soon" for v1. See `DECISIONS.md` for the full log.
>
> Locally the UI runs against a **stub** (no key needed); set `VITE_USE_STUB=false`
> under `netlify dev` to hit the real backend.

## Architecture (target)

```
Vite + React + TS SPA  ──>  Netlify Functions (serverless proxy, holds the key)
   (browser, no key)         /api/generate-roadmap | -lesson | -deeper
        │                      each fn: verify JWT → rate-limit → cache → Claude
        └─── Supabase ─────>  Auth + Postgres (profiles, roadmaps, progress,
                                                node_feedback, ai_cache, rate_limits)
```

## Prerequisites
- Node 20+
- (Later steps) A Supabase project and an Anthropic API key.

## Run locally

```bash
cd app
npm install
npm run dev          # http://localhost:5173  (uses the stub AI, no key needed)
```

To exercise the real backend once Step 2 lands, run the SPA and functions
together with the Netlify CLI:

```bash
npm i -g netlify-cli
netlify dev          # serves SPA + functions; set VITE_USE_STUB=false
```

## Environment variables
Copy `.env.example` → `.env` and fill in. **Never commit `.env`.**

| Variable | Side | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client | public |
| `VITE_SUPABASE_ANON_KEY` | client | public, protected by RLS |
| `ANTHROPIC_API_KEY` | server | **secret** — Netlify env only |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **secret** — Netlify env only |
| `PROMPT_VERSION` | server | bump to invalidate the AI cache |

Anything prefixed `VITE_` is bundled into the browser and is therefore public by
design. Secrets must **not** carry that prefix.

> ⚠️ If an Anthropic key was ever shipped in a browser build of the prototype,
> treat it as compromised and **rotate it**.

## Supabase setup (cache + rate limiting)
1. In your Supabase project, open **SQL Editor** and run
   `supabase/migrations/0001_cache_and_ratelimit.sql`. This creates the
   `ai_cache` and `rate_limits` tables (RLS on, service-role only) and the
   `check_rate_limit` function.
2. Set the **server-side** env vars (Netlify → Site settings → Environment, or
   your local `.env` for `netlify dev`):
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `PROMPT_VERSION`.
3. Caching is automatic. Every generation response includes an
   `X-OpenPath-Cache: HIT|MISS` header.

**Verify caching locally:** with `netlify dev` running against Supabase, generate
the same roadmap twice with the same calibration answers. The first response is
`MISS` (hits the model); the second is `HIT` (served from Postgres, no model
cost, near-instant). Different calibration answers → different key → `MISS`.

**Rate limits:** 30/hour and 150/day per IP across all generation endpoints
(free-tier defaults; tune `IP_LIMITS` in `netlify/functions/_shared.ts`). If
Supabase env is missing, caching and limiting are skipped and the proxy still
works.

## Auth & persistence
Run both migrations in the Supabase SQL editor (`0001_*` then `0002_*`).
`0002` adds `roadmaps`, `progress`, and `node_feedback`, each with RLS policies
keyed on `auth.uid()` so a user only ever sees their own rows.

- **Sign up / sign in** via email + password (Supabase Auth). The "Sign in" nav
  link only appears when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set;
  otherwise the app runs in **no-account mode** (generation works, nothing is
  saved).
- **Saved roadmaps + progress**: signed-in users' roadmaps auto-save on
  generation; completing a node persists; "My Roadmap" lists saved roadmaps to
  resume across sessions.
- **Feedback hook**: each lesson has a **⚑ Report issue** button that writes to
  `node_feedback` (admin-read only). Read it with the service role:
  `select * from node_feedback order by created_at desc;`
- **Per-user rate limit**: the client sends its session token; signed-in users
  get a 100/day budget on top of the per-IP caps.

> Persistence runs **directly browser→Supabase** under RLS (standard Supabase
> pattern). The Netlify Functions are only for the Anthropic proxy + cache/limits.

## Deploy (Netlify)
1. Connect the repo; build command `npm run build`, publish dir `dist`
   (already set in `netlify.toml`).
2. Add the env vars above in **Site settings → Environment variables**.
3. Deploy. `/api/*` is rewritten to the functions automatically.

## BYOK (bring your own key)
Users can paste their own Anthropic API key (nav → **🔑 Unlimited**) for
unlimited usage beyond the free daily limit. The key is stored **only in the
browser** (localStorage), sent per-request in the `X-User-Anthropic-Key` header,
used transiently by the function, and **never stored or logged** server-side.
BYOK requests skip rate limiting (self-funded) but still use the cache.

## Descoped for v1 (intentionally mocked)
- **Proctored exams** and **blockchain credentials** are "coming soon" stubs
  (`src/views/ComingSoon.tsx`). The original mock UIs are kept in `_prototype/`.
- **Privacy / minors:** AI proctoring implies camera/gaze capture. Before that
  module ships it needs an explicit consent flow, a data-retention policy, and
  special handling for **minors** (parental consent, COPPA/GDPR-K considerations).
  Do not enable proctoring without resolving these.

## Project layout
```
app/
  src/
    views/        Explore, RoadmapView, ComingSoon
    components/   CalibrationModal, LessonPanel, Diagram
    lib/          ai (client), stub, calibration
    data/         presets (popular roadmaps)
    styles.css    design system, ported verbatim from the prototype
    types.ts      shared domain types
  netlify/functions/   serverless proxy (Anthropic key + cache + rate limits)
  supabase/migrations/ SQL schema (cache, rate limits, roadmaps, progress, feedback)
```

## Contributing
Issues and PRs welcome. Run `npm run build` (typecheck + build) before opening a
PR. The app loop works against the stub with no keys, so you can develop most of
the frontend without any Supabase/Anthropic setup.

## License
[MIT](./LICENSE) © OpenPath Contributors.

Note: `package.json` is marked `"private": true` to guard against accidental
`npm publish`. That is unrelated to the source license — the code is MIT.
