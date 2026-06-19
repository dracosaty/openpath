# OpenPath — Go-Live checklist (manual steps)

Everything Claude can't do for you, in order. Tick top-to-bottom.
Live site already exists: **https://openpath-learn.netlify.app** (Netlify project
`openpath-learn`). It's currently running the demo/stub build until you finish
steps 1–4 below.

---

## 1. Secrets (do first)
- [ ] **Rotate** any Anthropic key that was ever used in the old browser prototype — assume it's compromised. (console.anthropic.com → API keys.)
- [ ] Create a fresh **Anthropic API key**. Set a **monthly spend limit** on it (Anthropic console → Billing → Limits) so a bug or abuse can't run up cost.

## 2. Supabase
- [ ] Open your Supabase project → **SQL Editor**. Run the migrations **in order**, one at a time (paste the file contents from `supabase/migrations/`):
  1. `0001_cache_and_ratelimit.sql`
  2. `0002_auth_persistence.sql`
  3. `0003_sharing.sql`
  4. `0004_referrals_personalization.sql`
  5. `0005_review.sql`
- [ ] **Settings → API**: copy the **Project URL**, the **anon public** key, and the **service_role** key (keep service_role secret).
- [ ] **Authentication → URL Configuration**:
  - Site URL: `https://openpath-learn.netlify.app` (or your custom domain).
  - Redirect URLs: add `https://openpath-learn.netlify.app/**`.
- [ ] **Authentication → Email**: decide whether "Confirm email" is on (more secure) or off (instant sign-in for the beta).
- [ ] *(optional)* **Authentication → Providers → Google**: enable + paste a Google OAuth Client ID/Secret (from console.cloud.google.com) to turn on the "Continue with Google" button.

## 3. Netlify environment variables
In **app.netlify.com → openpath-learn → Site configuration → Environment variables**, add (same value for all contexts):

| Key | Value | Secret |
|---|---|---|
| `ANTHROPIC_API_KEY` | your fresh key | 🔒 |
| `SUPABASE_URL` | Supabase Project URL | |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | 🔒 |
| `VITE_SUPABASE_URL` | same Project URL | |
| `VITE_SUPABASE_ANON_KEY` | anon public key | |
| `VITE_USE_STUB` | `false` | |
| `PROMPT_VERSION` | `v1` | |

> `VITE_*` are build-time — they only take effect on the **next deploy**.

## 4. Deploy the latest code
The first deploy was a manual upload. Pick one for ongoing deploys:
- **Recommended — connect Git (auto-deploy on push):** Netlify → openpath-learn → Project configuration → **Build & deploy → Link repository** → authorize GitHub and pick `satyhere/openpath`. (Your Netlify Git login is `dracosaty`; you may need to grant it access to the `satyhere` repo, or add a Netlify deploy key.) Build command `npm run build`, publish `dist` — already in `netlify.toml`.
- **Or** ask Claude to re-run the Netlify MCP deploy, **or** `npm i -g netlify-cli && netlify deploy --build --prod`.
- [ ] Trigger a deploy so it picks up the env vars + latest commit.

## 5. Verify production (5 min)
- [ ] Open the site → generate a roadmap → confirm real (not placeholder) content.
- [ ] Generate the **same** topic + answers again → second response should be a cache HIT (instant). Check a function response header `X-OpenPath-Cache: HIT` (DevTools → Network).
- [ ] Sign up → roadmap saves → refresh → progress persists → "My Roadmap" lists it.
- [ ] Open a lesson, answer the quiz → **Review** tab shows a due card → grade it.
- [ ] Share a roadmap → open the `?r=` link in an incognito window → public view + "Create my version".
- [ ] **🔑 Unlimited** → paste a test key → confirm `∞ Unlimited`; remove it after.
- [ ] Invite link `?ref=` → sign up a second test account → both get +10 bonus.
- [ ] Check feedback: report an issue on a lesson, then in Supabase run
  `select * from node_feedback order by created_at desc;`

## 6. Cost & abuse controls
- [ ] Confirm the Anthropic spend cap (step 1).
- [ ] Review rate-limit defaults in `netlify/functions/_shared.ts` (`IP_LIMITS` = 30/hr, 150/day per IP; per-user free base = 25/day). Tune for your budget.
- [ ] *(optional)* Schedule cache/rate-limit cleanup (the commented `pg_cron` SQL at the bottom of `0001_*.sql`).
- [ ] Watch Supabase usage (free tier row/storage limits) and Netlify Functions invocation count for the first week.

## 7. Domain (optional)
- [ ] Netlify → Domain management → add a custom domain (e.g. one of your brainstormed names) → update Supabase Site URL + Redirect URLs to match.

## 8. Legal / trust (before real users, especially minors)
- [ ] Add a **Privacy Policy** + **Terms** (cover: AI-generated content may be wrong; data stored in Supabase; BYOK keys stored only in the user's browser).
- [ ] If targeting **class 6+ / minors**: parental-consent stance, and keep the proctoring/blockchain modules as "coming soon" until the consent/retention work in the README is done.
- [ ] Add a visible "AI can be wrong — report issues" note (the per-lesson report button already writes to `node_feedback`).

## 9. Open-source flip (when ready)
- [ ] Repo is currently **private** (`satyhere/openpath`, MIT licensed). Flip to public: GitHub → Settings → General → Danger Zone → Change visibility.
- [ ] *(optional)* Add `CONTRIBUTING.md`, issue templates, and a CI workflow that runs `npm run build` on PRs.

---

### Quick reference
- Migrations: `supabase/migrations/0001…0005`
- Functions: `netlify/functions/` (proxy + cache + limits; holds the key)
- Strategy & tradeoffs: `PRODUCT.md`, `DECISIONS.md`
