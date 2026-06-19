// Shared server-side logic for the OpenPath AI proxy.
// The Anthropic key lives ONLY here (process.env), never in the browser.
// Prompts are ported verbatim from the original prototype to preserve behavior.

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LearnerProfile {
  familiarity: string;
  goal: string;
  pace: string;
  context?: string;
  language?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Using Haiku (fastest + cheapest Claude model) for cost-efficient generation.
// This is Claude (Anthropic) — set ANTHROPIC_API_KEY in Netlify env vars.
// Bump deliberately if you intend to change behavior; cache key includes model.
export const MODEL = "claude-haiku-4-5-20251001";

/** Profile → system-prompt fragment. Extends the prototype's x() with optional
 *  background context and output language. */
export function formatProfile(p: LearnerProfile): string {
  let s = `Learner profile — familiarity: ${p.familiarity}; goal: ${p.goal}; preferred pace: ${p.pace}.
Adapt vocabulary, depth and examples to this profile. A complete beginner gets plain language and analogies; an advanced learner gets precise terminology and nuance.`;
  if (p.context && p.context.trim()) {
    s += `\nLearner background/context: ${p.context.trim().slice(0, 1500)}. Use this to skip what they already know and emphasise their gaps; reference their stated field/curriculum where relevant.`;
  }
  if (p.language && p.language.trim() && p.language.trim().toLowerCase() !== "english") {
    s += `\nIMPORTANT: Write ALL content (titles, text, examples, quiz) in ${p.language.trim()}. Keep JSON keys in English.`;
  }
  return s;
}

/** Calls Claude and parses the JSON out of the response. Mirrors the prototype's b().
 *  apiKeyOverride is a user's BYOK key, used transiently and never stored/logged. */
export async function callClaude(
  userPrompt: string,
  system: string,
  maxTokens = 1000,
  apiKeyOverride?: string,
): Promise<any> {
  const apiKey = apiKeyOverride || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as any;
  let text: string =
    data.content?.find((c: any) => c.type === "text")?.text ?? "";
  text = text.replace(/```json\n?|```\n?/g, "").trim();
  const match = text.match(/[\[{][\s\S]*[\]}]/);
  return JSON.parse(match ? match[0] : text);
}

// ── Input validation ────────────────────────────────────────────────
export function isProfile(v: any): v is LearnerProfile {
  return (
    v &&
    typeof v.familiarity === "string" &&
    typeof v.goal === "string" &&
    typeof v.pace === "string"
  );
}

export function clampStr(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// ── HTTP helpers (Netlify Functions v2 / Web API) ───────────────────
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function methodGuard(req: Request): Response | null {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return null;
}

// ── Supabase admin (service role) ───────────────────────────────────
// Used ONLY server-side for the cache + rate-limit tables. If the env isn't
// configured (e.g. local `netlify dev` without Supabase), we degrade
// gracefully: no cache, no limiting — the proxy still works.
let _supa: SupabaseClient | null | undefined;
function supa(): SupabaseClient | null {
  if (_supa !== undefined) return _supa;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("Supabase env not set — cache & rate limiting disabled.");
    _supa = null;
  } else {
    _supa = createClient(url, key, { auth: { persistSession: false } });
  }
  return _supa;
}

const PROMPT_VERSION = process.env.PROMPT_VERSION || "v1";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function profileFingerprint(p: LearnerProfile): string {
  // Context + language change the output, so they must change the cache key.
  return `${p.familiarity}|${p.goal}|${p.pace}|${p.language || "English"}|${(p.context || "").trim()}`;
}

/** Cache key: sha256(flow:model:promptVersion:normalizedSubject:profileFingerprint). */
function cacheKey(flow: string, subject: string, profile: LearnerProfile): string {
  const raw = `${flow}:${MODEL}:${PROMPT_VERSION}:${normalize(subject)}:${profileFingerprint(profile)}`;
  return createHash("sha256").update(raw).digest("hex");
}

/** BYOK: extract a user's own Anthropic key from the request header.
 *  Validated for plausible shape; used transiently and NEVER logged or stored. */
export function getUserApiKey(req: Request): string | undefined {
  const k = req.headers.get("x-user-anthropic-key")?.trim();
  if (k && k.startsWith("sk-ant-") && k.length > 20 && k.length < 300) return k;
  return undefined;
}

export function getClientIp(req: Request, contextIp?: string): string {
  return (
    contextIp ||
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Conservative free-tier defaults — per IP, fixed windows. Tune before launch.
// Checked in order; first failure blocks the request.
const IP_LIMITS = [
  { suffix: "hour", limit: 30, windowSeconds: 3600 },
  { suffix: "day", limit: 150, windowSeconds: 86400 },
];

/** Returns true if allowed. Fails open if Supabase is unreachable (availability > strictness). */
async function checkRateLimit(ip: string): Promise<boolean> {
  const db = supa();
  if (!db) return true;
  for (const l of IP_LIMITS) {
    const { data, error } = await db.rpc("check_rate_limit", {
      p_id: `ip:${ip}:${l.suffix}`,
      p_limit: l.limit,
      p_window_seconds: l.windowSeconds,
    });
    if (error) {
      console.error("rate_limit rpc error:", error.message);
      return true; // fail open
    }
    if (data === false) return false;
  }
  return true;
}

/** Verify the Supabase JWT (if present) and return the user id, else null. */
async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const db = supa();
  if (!token || !db) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// Per-plan base daily generation budget. Referral bonus is added on top.
// "Daily limits free → refer for more": free users lift their cap by inviting.
const PLAN_BASE: Record<string, number> = {
  free_forever: 25,
  godspeed: 250,
};

/** Effective daily limit = plan base + referral bonus, read from the profile. */
async function userDailyLimit(db: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await db
    .from("profiles")
    .select("plan, bonus_daily")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return PLAN_BASE.free_forever;
  const base = PLAN_BASE[data.plan as string] ?? PLAN_BASE.free_forever;
  return base + (data.bonus_daily ?? 0);
}

async function checkUserRateLimit(userId: string): Promise<boolean> {
  const db = supa();
  if (!db) return true;
  const limit = await userDailyLimit(db, userId);
  const { data, error } = await db.rpc("check_rate_limit", {
    p_id: `user:${userId}:day`,
    p_limit: limit,
    p_window_seconds: 86400,
  });
  if (error) {
    console.error("user rate_limit rpc error:", error.message);
    return true; // fail open
  }
  return data !== false;
}

async function cacheGet(key: string): Promise<any | null> {
  const db = supa();
  if (!db) return null;
  const { data, error } = await db
    .from("ai_cache")
    .select("value")
    .eq("key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.error("cache get error:", error.message);
    return null;
  }
  return data?.value ?? null;
}

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function cacheSet(key: string, flow: string, value: unknown): Promise<void> {
  const db = supa();
  if (!db) return;
  const expires_at = new Date(Date.now() + TTL_MS).toISOString();
  const { error } = await db
    .from("ai_cache")
    .upsert({ key, flow, value, expires_at }, { onConflict: "key" });
  if (error) console.error("cache set error:", error.message);
}

/**
 * Wraps a generation: per-IP rate limit → cache lookup → produce → cache store.
 * `subject` is the normalized cache subject (topic for roadmap, node title for
 * lesson/deeper). `produce` does the actual Claude call + post-processing.
 */
export async function runGeneration(opts: {
  req: Request;
  ip: string;
  flow: string;
  subject: string;
  profile: LearnerProfile;
  produce: (apiKeyOverride?: string) => Promise<any>;
}): Promise<Response> {
  // BYOK: a user-supplied key (browser-only, never stored/logged here) means
  // they pay for their own usage → unlimited, so we skip rate limiting.
  const byok = getUserApiKey(opts.req);

  if (!byok) {
    if (!(await checkRateLimit(opts.ip))) {
      return json({ error: "Rate limit exceeded. Please try again later." }, 429);
    }
    // Per-user budget for signed-in callers (in addition to the IP cap).
    const userId = await getUserId(opts.req);
    if (userId && !(await checkUserRateLimit(userId))) {
      return json({ error: "Daily limit reached. Please try again tomorrow." }, 429);
    }
  }

  const key = cacheKey(opts.flow, opts.subject, opts.profile);

  const cached = await cacheGet(key);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-OpenPath-Cache": "HIT" },
    });
  }

  try {
    const value = await opts.produce(byok);
    await cacheSet(key, opts.flow, value);
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-OpenPath-Cache": "MISS" },
    });
  } catch (e: any) {
    console.error(`${opts.flow} failed:`, e?.message);
    return json({ error: "Generation failed" }, 502);
  }
}
