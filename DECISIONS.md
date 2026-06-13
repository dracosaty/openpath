# DECISIONS — OpenPath productionization

Running log of tradeoffs. Newest first. Items marked **[NEEDS INPUT]** want your call.

## Phase 1 — locked choices (from handoff Q&A)
- **Hosting:** Netlify (static SPA + Netlify Functions for the proxy).
- **Auth + DB:** Supabase (Postgres + Auth + RLS).
- **Mock modules:** Proctoring *and* blockchain credentials descoped to "coming soon" stubs for v1.
- **Scale/budget:** Tiny / free-tier only → aggressive caching, tight per-IP limits.

## Step 2 — backend proxy (this commit)
- **Netlify Functions v2 (Web API style)**: `generate-roadmap|lesson|deeper` under `netlify/functions/`. The Anthropic key is read only via `process.env.ANTHROPIC_API_KEY` in `_shared.ts` — server-only. **Verified**: built client bundle (`dist/`) contains no key, no `api.anthropic.com`, no `x-api-key`.
- **Prompts ported verbatim** from the prototype (roadmap 1500 tok, lesson 1100, deeper 1000), including the `formatProfile`/`x()` learner-profile fragment, the ` ```json ` fence stripping, and the regex JSON extraction. ID assignment (`rm_/p_/n_/d_`) moved server-side.
- **Model kept as `claude-sonnet-4-20250514`** to preserve behavior. **[NEEDS INPUT]** happy to upgrade to a newer model — it's a one-line change in `_shared.ts` and the cache key includes the model so it self-invalidates.
- **Input validation + clamping** (topic/title length, profile shape) on every function; bad input → 400, upstream failure → 502 with server-side log only (no key/detail leaked to client).
- **Client still defaults to the stub** (`VITE_USE_STUB` unset = stub on) so `npm run dev` works with no key. Real path runs via `netlify dev` with `VITE_USE_STUB=false`. `generateRoadmap` re-attaches `topic`/`profile` to the server's pure roadmap for the UI.
- Not done here (next step): caching + rate limiting. Each call currently hits the model every time.

## Step 1 — repo skeleton
- **Rebuilt source rather than un-minifying.** The handoff `openpath.html` is a *compiled* Vite bundle (no `src/`). The original is preserved at `_prototype/openpath.original.html`. Components were re-authored from the bundle's observed behavior; **the design-system CSS was copied verbatim** (`src/styles.css`, 53.6KB) so the look is unchanged.
- **Stubbed AI for now.** `src/lib/ai.ts` reads `USE_STUB` (default on). It serves shaped placeholder content from `src/lib/stub.ts` so the whole loop is clickable with no key/network. Step 2 flips it to call `/api/generate-*`.
- **Same-origin API contract decided up front:** browser calls `/api/generate-{roadmap,lesson,deeper}`; `netlify.toml` rewrites `/api/*` → functions; Vite dev proxies `/api` → `netlify dev` on :8888. This means zero CORS and the key never reaches the browser.
- **Presets simplified.** The prototype shipped 4 presets with *fully pre-baked* lessons. Step 1 keeps their titles/descriptions and routes them through the normal generate flow. **[NEEDS INPUT later]** whether to re-import the pre-baked lesson JSON (saves tokens, but it's static content).
- **Diagram renderer** reimplemented as a dependency-free flex layout using the design tokens. Faithful to the four types (flow/cycle/comparison/pyramid) but not pixel-identical to the prototype's SVG. Flag if you want exact parity.
- **Calibration `pace` options:** the prototype's third option was truncated in the bundle; reconstructed as "Deep & rigorous". Confirm wording if it matters.

## Open questions parked for their step
- Cache key strategy (Step 3) — proposed and approved: `sha256(flow:model:promptVersion:normalizedTopicOrNode:profileFingerprint)`.
- Rate-limit exact numbers (Step 3) — starting conservative; tune before launch.
