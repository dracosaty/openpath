// Shared server-side logic for the OpenPath AI proxy.
// The Anthropic key lives ONLY here (process.env), never in the browser.
// Prompts are ported verbatim from the original prototype to preserve behavior.

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
