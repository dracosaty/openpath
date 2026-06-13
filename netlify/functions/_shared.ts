// Shared server-side logic for the OpenPath AI proxy.
// The Anthropic key lives ONLY here (process.env), never in the browser.
// Prompts are ported verbatim from the original prototype to preserve behavior.

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LearnerProfile {
  familiarity: string;
  goal: string;
  pace: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Ported from the prototype. Bump deliberately if you intend to change behavior;
// the cache key (Step 3) includes the model so this also busts stale cache.
export const MODEL = "claude-sonnet-4-20250514";

/** Profile → system-prompt fragment. Ported verbatim from the prototype's x(). */
export function formatProfile(p: LearnerProfile): string {
  return `Learner profile — familiarity: ${p.familiarity}; goal: ${p.goal}; preferred pace: ${p.pace}.
Adapt vocabulary, depth and examples to this profile. A complete beginner gets plain language and analogies; an advanced learner gets precise terminology and nuance.`;
}

/** Calls Claude and parses the JSON out of the response. Mirrors the prototype's b(). */
export async function callClaude(
  userPrompt: string,
  system: string,
  maxTokens = 1000,
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
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
  return `${p.familiarity}|${p.goal}|${p.pace}`;
}

/** Cache key: sha256(flow:model:promptVersion:normalizedSubject:profileFingerprint). */
function cacheKey(flow: string, subject: string, profile: LearnerProfile): string {
  const raw = `${flow}:${MODEL}:${PROMPT_VERSION}:${normalize(subject)}:${profileFingerprint(profile)}`;
  return createHash("sha256").update(raw).digest("hex");
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

async function cacheGet(key: string): Promise<any | null> {
  const db = supa();
  if (!db) return null;
  const { data, error } = await db
    .from("ai_cache")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("cache get error:", error.message);
    return null;
  }
  return data?.value ?? null;
}

async function cacheSet(key: string, flow: string, value: unknown): Promise<void> {
  const db = supa();
  if (!db) return;
  const { error } = await db
    .from("ai_cache")
    .upsert({ key, flow, value }, { onConflict: "key" });
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
  produce: () => Promise<any>;
}): Promise<Response> {
  const allowed = await checkRateLimit(opts.ip);
  if (!allowed) {
    return json(
      { error: "Rate limit exceeded. Please try again later." },
      429,
    );
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
    const value = await opts.produce();
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
