# DECISIONS — OpenPath productionization

Running log of tradeoffs. Newest first. Items marked **[NEEDS INPUT]** want your call.

## Phase 1 — locked choices (from handoff Q&A)
- **Hosting:** Netlify (static SPA + Netlify Functions for the proxy).
- **Auth + DB:** Supabase (Postgres + Auth + RLS).
- **Mock modules:** Proctoring *and* blockchain credentials descoped to "coming soon" stubs for v1.
- **Scale/budget:** Tiny / free-tier only → aggressive caching, tight per-IP limits.

## Step 1 — repo skeleton (this commit)
- **Rebuilt source rather than un-minifying.** The handoff `openpath.html` is a *compiled* Vite bundle (no `src/`). The original is preserved at `_prototype/openpath.original.html`. Components were re-authored from the bundle's observed behavior; **the design-system CSS was copied verbatim** (`src/styles.css`, 53.6KB) so the look is unchanged.
- **Stubbed AI for now.** `src/lib/ai.ts` reads `USE_STUB` (default on). It serves shaped placeholder content from `src/lib/stub.ts` so the whole loop is clickable with no key/network. Step 2 flips it to call `/api/generate-*`.
- **Same-origin API contract decided up front:** browser calls `/api/generate-{roadmap,lesson,deeper}`; `netlify.toml` rewrites `/api/*` → functions; Vite dev proxies `/api` → `netlify dev` on :8888. This means zero CORS and the key never reaches the browser.
- **Presets simplified.** The prototype shipped 4 presets with *fully pre-baked* lessons. Step 1 keeps their titles/descriptions and routes them through the normal generate flow. **[NEEDS INPUT later]** whether to re-import the pre-baked lesson JSON (saves tokens, but it's static content).
- **Diagram renderer** reimplemented as a dependency-free flex layout using the design tokens. Faithful to the four types (flow/cycle/comparison/pyramid) but not pixel-identical to the prototype's SVG. Flag if you want exact parity.
- **Calibration `pace` options:** the prototype's third option was truncated in the bundle; reconstructed as "Deep & rigorous". Confirm wording if it matters.

## Open questions parked for their step
- Cache key strategy (Step 3) — proposed and approved: `sha256(flow:model:promptVersion:normalizedTopicOrNode:profileFingerprint)`.
- Rate-limit exact numbers (Step 3) — starting conservative; tune before launch.
