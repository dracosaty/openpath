import type { Context } from "@netlify/functions";
import {
  callClaude,
  clampStr,
  json,
  methodGuard,
  getClientIp,
  runGenerationNoCache,
} from "./_shared";

// Privacy note: unlike the other generation endpoints, this one NEVER caches
// (see runGenerationNoCache) — a resume + job description is sensitive
// user-pasted content and must not be persisted anywhere server-side. It's
// processed in-memory for this request only.
export default async (req: Request, context: Context): Promise<Response> => {
  const bad = methodGuard(req);
  if (bad) return bad;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // "topic" mode: no resume/JD yet — browse a general briefing for a domain
  // (the "Explore interview topics" section). "personalized" mode (default)
  // requires resume+JD and tailors the whole plan to that specific pairing.
  const mode = payload?.mode === "topic" ? "topic" : "personalized";

  const SHAPE = `{
  "matchScore": 0-100 (0 if no resume was given),
  "summary": "One sentence on overall fit and what to focus on",
  "strengths": ["3 items"],
  "gaps": ["3 items — the specific things this candidate is weakest on for this role"],
  "talkingPoints": ["2 items"],
  "learningPlan": [
    {
      "title": "A gap area to study (max 5 words), e.g. 'Kafka & event-driven systems'",
      "nodes": ["3-4 specific concepts within that area to learn, each max 6 words"]
    }
  ],
  "questions": [
    { "category": "Behavioral" | "Technical" | "Role-specific" | "Questions to ask them", "q": "The interview question", "tip": "One sentence: what it's really testing" }
  ]
}`;

  let system: string;
  let userPrompt: string;

  if (mode === "topic") {
    const topic = clampStr(payload?.topic, 120);
    if (!topic) return json({ error: "Missing topic" }, 400);

    system = `You are an expert interview coach and learning-plan designer. You produce a general interview-prep briefing for a domain — not tailored to any specific candidate, but a strong, concrete starting point including what to study. Respond ONLY with valid JSON. No markdown, no commentary.`;

    userPrompt = `Interview topic/domain: "${topic}"

Produce a concise general interview-prep briefing AND study plan for this domain. Keep every text field brief — one sentence each, or a few words per item. "matchScore" should be 0 and "strengths"/"gaps" should describe what interviewers typically look for / common weak spots (not resume-specific). "learningPlan" is the core focus: 3-4 topic areas someone should study to be strong in this domain, each with 3-4 specific concepts. Return ONLY: ${SHAPE}
Include exactly 4 questions total, spread across categories. Be concise — no filler.`;
  } else {
    const resume = clampStr(payload?.resume, 6000);
    const jobDescription = clampStr(payload?.jobDescription, 4000);
    const targetRole = clampStr(payload?.targetRole, 120);
    const additionalContext = clampStr(payload?.additionalContext, 1000);
    if (!resume) return json({ error: "Missing resume" }, 400);
    if (!jobDescription) return json({ error: "Missing job description" }, 400);

    system = `You are an expert interview coach and learning-plan designer. You read a candidate's resume alongside a specific job description and produce a tailored plan: what's missing, what to study to close those gaps before the interview, and a few sharp practice questions. Respond ONLY with valid JSON. No markdown, no commentary.`;

    userPrompt = `Candidate resume:
"""
${resume}
"""

Job description${targetRole ? ` (role: ${targetRole})` : ""}:
"""
${jobDescription}
"""
${additionalContext ? `\nAdditional context from the candidate: """${additionalContext}"""\n` : ""}
Analyze the fit and produce a concise, tailored prep plan. Keep every text field brief. The most important output is "learningPlan": a focused, prioritized study plan (3-4 topic areas, grounded in the ACTUAL gaps between this resume and this JD, each with 3-4 specific concepts to learn — specific enough that each concept could become its own short lesson). Return ONLY: ${SHAPE}
Include exactly 4 questions total, spread across categories. Be concise — no filler.`;
  }

  return runGenerationNoCache({
    req,
    ip: getClientIp(req, context.ip),
    flow: "interview-prep",
    produce: async () => {
      const r = await callClaude(userPrompt, system, 1400);
      const t = Date.now();
      return {
        matchScore: typeof r.matchScore === "number" ? r.matchScore : 0,
        summary: r.summary || "",
        strengths: r.strengths || [],
        gaps: r.gaps || [],
        talkingPoints: r.talkingPoints || [],
        learningPlan: (r.learningPlan || []).map((p: any, pi: number) => ({
          title: p.title || `Focus area ${pi + 1}`,
          nodes: (p.nodes || []).map((n: any) => (typeof n === "string" ? n : n.title || "")),
        })),
        questions: (r.questions || []).map((q: any, i: number) => ({
          id: `iq_${t}_${i}`,
          category: q.category || "Role-specific",
          q: q.q || "",
          tip: q.tip || "",
        })),
      };
    },
  });
};
