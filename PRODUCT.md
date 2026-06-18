# OpenPath — product & growth notes

## Who it's for
Self-directed learners — students, career-switchers, hobbyists — who want a
*structured* path for any topic, personalised to their level, for free.

## Value pillars (retention)
1. **Personalised structure** — a real roadmap, not a chat transcript. Calibrated
   to familiarity / goal / pace.
2. **Momentum** — visible % progress, persisted across sessions. (Next: daily
   streaks, "continue where you left off" nudges, email/push re-engagement.)
3. **Real learning, not just reading** — quizzes today; **spaced-repetition
   review** of past quiz items is the highest-value next feature (most AI-learning
   tools skip the thing that actually creates retention of knowledge).
4. **Proof** — a completion artifact worth posting. (Lightweight today; the
   descoped "verifiable credential" is the heavyweight version.)

## Growth model — be honest about the math
Viral coefficient:

> **k = (shares per active user) × (share→activation conversion)**

A *sustained* k ≥ 2 is effectively unprecedented (peak Dropbox/PayPal were
~0.6–0.7 and won on **retention × paid loops**, not pure virality). We optimise
each term honestly rather than chase a number:

- **Shares per user ↑** — make the shareable artifact intrinsic, not bolted on.
  Every roadmap *is* the share unit; a completion card is a second trigger at the
  emotional peak. Native share sheet on mobile = lowest friction.
- **Conversion ↑** — a shared link lands on a beautiful read-only roadmap whose
  single dominant CTA is *"Create my version →"*, pre-seeded with the topic. A
  viewer becomes a creator in 2 taps (topic already known → calibrate → done).

The realistic, durable win is **k as high as we can push it (target 0.5–1.0) ×
strong retention** — that still compounds hard. We instrument it (see below) so
the number is measured, not guessed.

### The loop shipped now
```
generate → Share (public link + socials, 1 tap)
        → viewer sees read-only roadmap + "Create my version"
        → calibrate → their own roadmap → they share → …
```
- Public roadmaps: `?r=<id>` → `get-public-roadmap` (service-role, only
  `is_public`, owner fields stripped).
- Completion card: fires at 100% with a "share my achievement" CTA.
- Signed-out users still share a `?topic=` link that seeds the generator.

### Instrumentation
`roadmap_shares` table + `bump_share_metric()` count **views** and **creates**
per shared roadmap. creates ÷ views ≈ the conversion half of k. (Add a
shares-per-user metric next.)

## Highest-leverage next bets (in order)
1. **Rich link unfurls (OG)** — server-render `/r/:id` with per-roadmap OG meta +
   a dynamic share image. This multiplies conversion on every social paste; it's
   the biggest single uplift and the main remaining piece of the loop. (Needs a
   deploy to verify against real scrapers.)
2. **Spaced-repetition review** — daily review queue from past quizzes. Retention.
3. **Streaks + re-engagement** — daily streak, reminder email/push.
4. **"Study together"** — invite friends to the same roadmap; shared progress.
   Turns 1 share into N.
5. **Referral unlock** — soft cap on heavy generation that an invite lifts (only
   if free-tier costs bite; keep it non-scummy).

## Guardrails
- Don't gate the core value behind sharing — that kills trust and word-of-mouth.
- AI curriculum is sometimes wrong: the per-node feedback hook must stay
  prominent; review reported items.
