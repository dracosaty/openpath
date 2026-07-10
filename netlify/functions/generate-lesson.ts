import type { Context } from "@netlify/functions";
import {
  callClaude,
  formatProfile,
  isProfile,
  clampStr,
  json,
  methodGuard,
  getClientIp,
  runGeneration,
} from "./_shared";

export default async (req: Request, context: Context): Promise<Response> => {
  const bad = methodGuard(req);
  if (bad) return bad;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const nodeTitle = clampStr(payload?.nodeTitle, 200);
  const pathTitle = clampStr(payload?.pathTitle, 200);
  const profile = payload?.profile;
  if (!nodeTitle || !pathTitle) return json({ error: "Missing nodeTitle/pathTitle" }, 400);
  if (!isProfile(profile)) return json({ error: "Missing or invalid profile" }, 400);

  const system = `Expert teacher. ${formatProfile(profile)} Respond ONLY with valid JSON, no markdown.`;

  const userPrompt = `Teach "${nodeTitle}" (from the "${pathTitle}" path). Return ONLY: { "lessonText":"3-4 sentence core explanation for this learner", "example":"One short concrete worked example or real scenario (2-3 sentences)", "diagram":{"type":"flow|cycle|comparison|pyramid (pick what fits the concept best)","title":"diagram caption","items":[{"label":"max 4 words","detail":"max 8 words"}],"colA":"only for comparison","colB":"only for comparison"}, "keyTerms":[{"term":"word","def":"max 10 words"} x3], "funFact":"one surprising fact", "quiz":[{"q":"one check question","options":["A","B","C"],"answer":"exact correct option"}] } "quiz" must be a JSON array even though it has only one item. Diagram rules: flow=3-5 sequential steps; cycle=3-5 repeating stages; comparison=2x2-3 items contrasting colA vs colB (items: first half colA, second half colB); pyramid=3-4 levels broad-to-narrow.`;

// The model doesn't always follow the "quiz must be an array" instruction —
// a single-question quiz sometimes comes back as a bare object instead of a
// 1-item array, which crashes client code expecting Array#map. It also
// sometimes returns just the option's letter ("B") instead of the exact
// option text it was asked for, which would silently grade every answer as
// wrong. Normalize both here so the client always gets a well-formed shape.
function normalizeQuiz(raw: any): { q: string; options: string[]; answer: string }[] {
  const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return arr
    .filter((q: any) => q && typeof q.q === "string" && Array.isArray(q.options))
    .map((q: any) => {
      const options = q.options.map((o: any) => String(o));
      let answer = String(q.answer ?? "");
      if (!options.includes(answer)) {
        const letter = answer.trim().replace(/[.)]/g, "").toUpperCase();
        const byLetter = options.find((o: string) => {
          const head = o.trim().toUpperCase();
          return head === letter || head.startsWith(`${letter}.`) || head.startsWith(`${letter})`);
        });
        answer = byLetter ?? options[0] ?? answer;
      }
      return { q: q.q, options, answer };
    });
}

  return runGeneration({
    req,
    ip: getClientIp(req, context.ip),
    flow: "lesson",
    // Lessons are scoped to their path so the same node title in different
    // roadmaps doesn't collide in cache.
    subject: `${pathTitle} :: ${nodeTitle}`,
    profile,
    produce: async () => {
      const i = await callClaude(userPrompt, system, 1100);
      return {
        lessonText: i.lessonText,
        example: i.example,
        diagram: i.diagram,
        keyTerms: i.keyTerms,
        funFact: i.funFact,
        quiz: normalizeQuiz(i.quiz),
      };
    },
  });
};
