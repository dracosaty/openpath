# OpenPath

AI-guided learning platform. Type any topic → answer 3 calibration questions →
get a personalised roadmap with per-node lessons (text, diagrams, quizzes, and
"go deeper" branches).

This repo is the productionized version of the original single-file prototype
(preserved at `_prototype/openpath.original.html`). It splits that bundle into a
proper **Vite + React + TypeScript** app and adds a thin serverless backend so
the Anthropic API key is never exposed to the browser.

> **Build status:** Phase 1, Step 1 — repo skeleton. The UI loop runs against a
> local **stub** (no API key needed). The backend proxy, caching, auth, and
> persistence land in subsequent steps. See `DECISIONS.md`.

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

## Deploy (Netlify)
1. Connect the repo; build command `npm run build`, publish dir `dist`
   (already set in `netlify.toml`).
2. Add the env vars above in **Site settings → Environment variables**.
3. Deploy. `/api/*` is rewritten to the functions automatically.

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
  netlify/functions/   (serverless proxy — added in Step 2)
```
