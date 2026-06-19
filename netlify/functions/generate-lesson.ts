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

  const userPrompt = `Teach "${nodeTitle}" (from the "${pathTitle}" path). Return ONLY: { "lessonText":"3-4 sentence core explanation for this learner", "example":"One short concrete worked example or real scenario (2-3 sentences)", "diagram":{"type":"flow|cycle|comparison|pyramid (pick what fits the concept best)","title":"diagram caption","items":[{"label":"max 4 words","detail":"max 8 words"}],"colA":"only for comparison","colB":"only for comparison"}, "keyTerms":[{"term":"word","def":"max 10 words"} x3], "funFact":"one surprising fact", "quiz":[{"q":"one check question","options":["A","B","C"],"answer":"exact correct option"}] } Diagram rules: flow=3-5 sequential steps; cycle=3-5 repeating stages; comparison=2x2-3 items contrasting colA vs colB (items: first half colA, second half colB); pyramid=3-4 levels broad-to-narrow.`;

  return runGeneration({
    req,
    ip: getClientIp(req, context.ip),
    flow: "lesson",
    // Lessons are scoped to their path so the same node title in different
    // roadmaps doesn't collide in cache.
    subject: `${pathTitle} :: ${nodeTitle}`,
    profile,
    produce: async (apiKey?: string) => {
      const i = await callClaude(userPrompt, system, 1100, apiKey);
      return {
        lessonText: i.lessonText,
        example: i.example,
        diagram: i.diagram,
        keyTerms: i.keyTerms,
        funFact: i.funFact,
        quiz: i.quiz || [],
      };
    },
  });
};
