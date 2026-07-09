# DECISIONS — OpenPath productionization

Running log of tradeoffs. Newest first. Items marked **[NEEDS INPUT]** want your call.

## Phase 1 — locked choices (from handoff Q&A)
- **Hosting:** Netlify (static SPA + Netlify Functions for the proxy).
- **Auth + DB:** Supabase (Postgres + Auth + RLS).
- **Mock modules:** Proctoring *and* blockchain credentials descoped to "coming soon" stubs for v1.
- **Scale/budget:** Tiny / free-tier only → aggressive caching, tight per-IP limits.

## BYOK — bring your own AI key (this commit)
- **Unlimited usage** via a user-supplied Anthropic key, on top of free daily limits.
- **Security:** key lives ONLY in the browser (`localStorage`), sent per-request in `X-User-Anthropic-Key` over HTTPS, used transiently by the function, **never stored or logged** server-side. `getUserApiKey()` validates the `sk-ant-` shape; anything malformed is ignored (falls back to platform key + limits). Verified: valid key works with NO platform key and **skips rate limiting**; garbage key still rate-limited.
- BYOK still uses the cache (saves the user's tokens on repeats) and still populates it (benefits everyone).
- UI: `ByokModal` (paste/remove key, privacy note, "get a key" link) from a nav entry that shows `🔑 Unlimited` → `∞ Unlimited` when active. Available without an account. A 429 now suggests inviting friends or adding a key.
- **[NOTE]** the function does see the key in-flight (unavoidable when proxying); we never persist/log it. A fully zero-knowledge path (browser → Anthropic direct) would lose caching + reintroduce the browser-CORS issue, so we didn't.

## Root-caused: "NVIDIA outage" was a local-IP silent throttle (this commit)
- Symptom: every local call to `https://integrate.api.nvidia.com/v1/chat/completions` hung to timeout (HTTP 000) for ~an hour — across 5 models and 3 API keys — while `GET /v1/models` answered in <250ms. Looked exactly like a provider outage.
- **Proof it wasn't**: production (Netlify → NVIDIA) generated fine at the very same minute (200 in 5s, same key family + model). NVIDIA's gateway silently drops (not 429s) inference POSTs from an origin IP that exceeded free-tier rate limits — dozens of rapid test curls from this machine triggered it. `netlify dev` runs functions on the local machine, so the local app inherited the flagged IP → the browser saw 502s and "stuck at Designing a path…".
- **Lesson**: never conclude provider outage from local tests alone; hit the deployed function as the control. And don't hammer the free endpoint with test loops from one IP.
- Fix shipped: nothing was wrong with the code. Deployed the pending work (interview-prep wizard + pivot + BYOK removal) via MCP upload; env `NVIDIA_API_KEY` set to the newest key. Verified live: roadmap 6.1s, personalized interview prep 9.2s (learningPlan correctly identified Kafka/distributed-systems/leadership/PCI gaps), topic mode 4.8s, lesson-for-plan-node 200 with quiz.

## Interview Prep — resume + JD → tailored practice (this commit)
- **New feature**: paste a resume + a job description, get a match score, gaps to address, talking points, and 6 categorized practice questions (Behavioral/Technical/Role-specific/Questions-to-ask-them) with coaching tips — all grounded in the *pairing* of this resume and this specific JD, not generic content. Then a self-paced flip-card practice mode.
- **Privacy is the core design constraint, not an afterthought.** New `netlify/functions/generate-interview-prep.ts` uses a new `runGenerationNoCache` (`_shared.ts`) that keeps rate limiting but **never reads or writes the `ai_cache` table** — unlike every other generation endpoint. A resume is sensitive; it's processed in-memory for the one request and never persisted anywhere server-side. Stated plainly in the UI.
- **[PARKED] Not wired into spaced-repetition review.** `review_items`/`ReviewView` are hard-coded to multiple-choice (`options[]` + `answer`) — interview questions are open-ended and don't fit that shape. Forcing it would be a bad retrofit, so v1 ships its own lightweight self-paced "flip through, reveal tip + sample answer" practice mode instead, no persistence, no SRS scheduling. A real fix would need an open-ended review-item variant (self-graded, no options) — worth doing later since spaced drilling on *your own* likely questions is the most differentiated part of this feature idea.
- **Prompt sizing tuned for the free tier's latency, the hard way.** First version asked for 8-12 questions at 1800 max_tokens — reliably exceeded the 9.5s abort (Netlify's sync function window) once the shared NVIDIA endpoint was under moderate load (it was fast, ~7-9s, earlier in the session; got slower later the same day — this is a shared free key, expect this to vary). Cut to **6 questions, one-sentence tips/outlines, 1100 max_tokens** — reliably ~7-8s. General lesson: on this backend, prompt output size is the lever that matters most for staying under the timeout, more than the input size.
- Verified end-to-end in the browser against the real backend (not the stub): form submit → real tailored report (60% match, correctly flagged missing Kafka/PCI-compliance experience from the JD, referenced actual resume specifics) → practice mode flip-through with reveal + next/previous.
- **Local live-testing setup**: added an `openpath-live` config to the (root-level, not app-level) `.claude/launch.json` running `netlify dev --offline` — serves the real functions locally without requiring `netlify login`. Needs a local `OpenPath/app/.env` (gitignored) with `NVIDIA_API_KEY` + `PROMPT_VERSION` + **`VITE_USE_STUB=false`** (easy to forget the last one — local dev defaults to the stub otherwise, which silently renders placeholder content that looks plausible but isn't real).

## Provider latency + deploy gotchas (live debugging notes)
- **The nemotron *reasoning* model in the user's snippet is unusable for sync functions** — 20–60s+ latency vs Netlify's ~10s function timeout → 502s. Switched the default to **`meta/llama-3.1-8b-instruct`** on the same NVIDIA endpoint/key: ~4s roadmaps, ~7–8s lessons, valid JSON. Verified live (200s). Quality is 8B-level — fine for a free default; users can BYOK Anthropic for higher quality, or we can swap to a better fast model later.
- Added a 9.5s AbortController in `callNvidia` to fail clean before Netlify's hard kill.
- **Netlify env-var gotcha:** setting a var via the MCP with `envVarIsSecret:true` + a single scope **silently did not persist** (`getAllEnvVars` returned `[]`). Re-setting with `newVarScopes:["all"]`, `newVarContext:"all"`, non-secret worked. **Function env changes require a redeploy** to take effect. Live `NVIDIA_API_KEY`, `VITE_USE_STUB=false`, `PROMPT_VERSION=v1` are now set.
- Caching/limits are still OFF in prod until the user adds the Supabase env vars (graceful-degrade: generation works without them, every call is a MISS).

## Default provider = NVIDIA; desktop scaling (this commit)
- **Default model for ALL users: NVIDIA's OpenAI-compatible endpoint** (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, free), so generation works out of the box with no Anthropic key. `_shared.ts` now has a provider dispatcher: **BYOK Anthropic key → Anthropic** (their cost), else **NVIDIA** (`NVIDIA_API_KEY`), else Anthropic env fallback. `enable_thinking:false` for fast, clean JSON; `max_tokens` floored at 2048 to avoid truncation. Cache key now includes the active model tag so providers don't collide. Verified end-to-end (function → real NVIDIA → valid roadmap).
- **NVIDIA_API_KEY set on Netlify** (functions scope, secret) + **VITE_USE_STUB=false** (builds) via MCP. ⚠️ The NVIDIA key was provided in chat and lives in Netlify env only — NOT committed. Rotate if it leaks; it's a shared free key.
- **Desktop responsiveness:** the layout was already centered/fluid (hero 880, sections 1040); added large-screen bumps (≥1281px → 1200; ≥1660px → 1320) so big monitors use the space, plus nav-email truncation so a long email can't overflow the desktop nav. The earlier "desktop looks off" was the **stale demo deploy** — fixed by redeploying.

## BYOK + redesign — glassmorphism, responsive, landing, social (this commit)
- **BYOK (bring your own key):** users paste their own Anthropic key for unlimited usage. Stored **only in the browser** (`localStorage`, `src/lib/byok.ts`), sent per-request as `X-User-Anthropic-Key` over HTTPS, used transiently in `callClaude` and **never stored/logged server-side** (`getUserApiKey` validates `sk-ant-` shape). BYOK requests **skip rate limits** (their cost) but still use cache. **Gated behind auth** (`openByok`: requires session in prod; allowed directly only when auth isn't configured at all, i.e. local dev).
- **Glassmorphism + responsive layer** (`src/glass.css`, loaded after `styles.css`): aurora backdrop, frosted-glass nav/cards/footer over the existing warm-paper palette. Fixed the mobile nav overflow with a **hamburger + glass drawer** (≤880px); responsive hero/gen-box (stacks)/modals/grids at 640/760/880/560 breakpoints. Base design system untouched.
- **Landing page rebuilt** (`Explore.tsx`): hero (kept animated placeholder) + How-it-works (3 steps) + Features (6 glass cards) + **Community/social section** + Popular presets + dark CTA band + full footer.
- **Social (mock):** `src/data/community.ts` — 6 shared roadmaps with author + learner counts; clicking opens the read-only `PublicRoadmap` (same conversion loop). Replace with live data later.
- Verified in preview: desktop sections, mobile drawer (no overflow), BYOK modal, community→public loop, build green.

## Retention — spaced-repetition review (this commit)
- **The retention lever.** Quiz questions answered in lessons become review cards, re-surfaced on a pruned **SM-2** schedule. Migration `0005`: `review_items` (ease/interval/repetitions/due_at, unique per user+node+question), RLS own-rows.
- **Works for everyone:** `src/lib/review.ts` is a unified store — Supabase when signed in (cross-device), **localStorage when signed out** (device-local) — so review doesn't require an account. Same shape both sides.
- **3-grade UI** (Again/Good/Easy) instead of SM-2's 0–5, one tap. `src/lib/srs.ts` is pure + unit-tested (1→6→15-day progression, ease floor 1.3, lapse → 10-min relearn, easy > good). Grade buttons show the next interval ("Good · 1 day").
- **Nav "Review" badge** with due count = a daily reason to return. Cards enqueued on quiz answer in the lesson panel.
- **[NEEDS INPUT]** signed-out localStorage reviews don't migrate into the account on sign-in yet (a future merge step). Acceptable for now.

## Growth — referrals + personalization + multilingual (this commit)
From the founder's notebook ("daily limits free → refer for more", resume/LinkedIn
personalization, curriculum/India, multilingual). Triage + what shipped:
- **Referral quota = virality engine.** Migration `0004`: `profiles` (referral_code, bonus_daily, plan, context, language), `referrals`, a signup trigger that auto-creates a profile with a unique code, and SECURITY DEFINER `redeem_referral()` (grants +10/day to BOTH parties, once) + `my_referral_stats()`. Per-user daily limit is now `PLAN_BASE[plan] + bonus_daily` (free_forever=25, godspeed=250). Verified: limit math reads the profile. `?ref=<code>` captured to localStorage, redeemed after sign-in. Invite modal = a built-in share surface.
- **Personalization (resume/context + language).** `LearnerProfile` gains optional `context` + `language`; `formatProfile` injects "skip what you already know / target gaps" and a language directive; both are in the cache key (different context/lang → different cache). Calibration modal gains an optional background textarea (prefilled/saved to profile for signed-in users) and a 16-language selector (India-first). Verified prompt injection.
- **Plan tiers: scaffolded, not monetized.** `plan` column + per-plan base limits exist; no payments (out of Phase-1 scope). "godspeed" is just a higher cap for now. **[NEEDS INPUT]** pricing + whether to add Stripe later.
- **Curriculum/India + class 6–PhD:** served via the free-text context ("CBSE class 10") rather than a bespoke selector. **[NEEDS INPUT]** whether a dedicated board/exam picker is worth it.
- Per-referral bonus (10) is duplicated as a constant in SQL and `InviteModal`; keep them in sync or centralize later.

## Step 4 + 5 — auth, persistence, feedback (this commit)
- **Folded Step 5 (feedback) into Step 4** — both need auth + a table; small and cohesive.
- **Persistence is browser→Supabase under RLS**, not via the functions. This is the standard Supabase pattern and keeps the functions focused on the Anthropic proxy. Migration `0002` adds `roadmaps`, `progress`, `node_feedback`, each with `auth.uid()`-scoped policies. `node_feedback` has insert-only policy (admin reads via service role).
- **Auth:** email/password (Supabase Auth) via `AuthModal`. Email-confirmation flow handled (shows "check your email" then returns to sign-in). **[NEEDS INPUT]** confirm whether to enable email confirmation in Supabase (default on) or allow instant sign-in for the beta.
- **No-account mode:** if `VITE_SUPABASE_*` is unset, `supabase` is null, "Sign in" is hidden, and every db call no-ops. App still generates. This is also why local stub dev needs no Supabase.
- **Saved-roadmaps UX:** generation auto-saves; "My Roadmap" shows a resume list when there's no active roadmap; completion + "go deeper" mutations persist. Kept intentionally simple — no rename/delete/share yet.
- **Per-user rate limit:** client attaches the Supabase access token; functions verify it (`getUser`) and apply a 100/day per-user cap on top of the IP caps. Verified token-less path still works (IP-only).
- **Data model choice:** progress is its own table (one row per completed node) rather than a jsonb array on `roadmaps` — clean upserts/deletes and indexable. Full roadmap stored as jsonb (it's read whole).

## Step 3 — caching + rate limiting (this commit)
- **Storage:** Supabase Postgres. Two tables in `supabase/migrations/0001_cache_and_ratelimit.sql`: `ai_cache` and `rate_limits`. RLS on, **no policies** → only the service-role key (functions) can touch them; anon/auth clients are denied.
- **Cache key (approved):** `sha256(flow : model : promptVersion : normalizedSubject : profileFingerprint)`. Verified: casing/whitespace-insensitive, profile-sensitive, flow-sensitive. `promptVersion` = `PROMPT_VERSION` env (default `v1`) — bump to invalidate everything; model is in the key so a model upgrade self-invalidates. Lesson/deeper subjects are namespaced by path (`path :: node`) so the same node title in two roadmaps doesn't collide.
- **Responses carry `X-OpenPath-Cache: HIT|MISS`** so cache behavior is observable.
- **Rate limiting:** fixed-window per-IP via the `check_rate_limit` SQL function (atomic upsert). Conservative free-tier defaults: **30/hour and 150/day per IP** across all generation endpoints. Tune in `IP_LIMITS` (`_shared.ts`) before launch. Per-*user* limits come with auth in Step 4.
- **Fail-open / graceful degrade:** if Supabase env is unset or the DB errors, caching and limiting are skipped and the proxy still serves (availability > strictness for v1). Verified the no-env path still returns 200.
- **[NEEDS INPUT later]** rate-limit numbers are a guess; revisit once you know real usage. Also: no cache TTL yet — entries live until manually pruned (housekeeping SQL is in the migration, commented, ready for pg_cron).

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
