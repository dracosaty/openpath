import {
  callClaude,
  formatProfile,
  isProfile,
  clampStr,
  json,
  methodGuard,
} from "./_shared";

export default async (req: Request): Promise<Response> => {
  const bad = methodGuard(req);
  if (bad) return bad;

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const topic = clampStr(payload?.topic, 200);
  const profile = payload?.profile;
  if (!topic) return json({ error: "Missing topic" }, 400);
  if (!isProfile(profile)) return json({ error: "Missing or invalid profile" }, 400);

  const system = `You are an expert curriculum designer who builds learning roadmaps for any subject — academic, professional, or hobby. ${formatProfile(
    profile,
  )} Respond ONLY with valid JSON. No markdown, no commentary.`;

  const userPrompt = `Design a learning roadmap for: "${topic}".
Structure it as 3-5 ordered phases (from foundations to mastery), each with 3-6 concise topic nodes.
Return ONLY:
{
  "title": "Clean roadmap title",
  "description": "One sentence on what the learner will be able to do at the end",
  "level": "Beginner|Intermediate|Advanced (based on the profile)",
  "timeEstimate": "Realistic total e.g. '4-6 weeks at 30 min/day'",
  "outcomes": ["3-4 concrete capability statements starting with an action verb, e.g. 'Build and deploy a working CLI tool'. Make them specific to the learner's stated goal, not generic."],
  "phases": [
    { "title": "Phase name", "nodes": [ { "title": "Topic (max 5 words)" } ] }
  ]
}`;

  try {
    const r = await callClaude(userPrompt, system, 1500);
    const t = Date.now();
    // Post-process into our Roadmap shape, assigning stable ids (ported from prototype).
    const roadmap = {
      id: `rm_${t}`,
      title: r.title || topic,
      description: r.description || "",
      level: r.level || "Beginner",
      timeEstimate: r.timeEstimate || "",
      outcomes: r.outcomes || [],
      phases: (r.phases || []).map((p: any, pi: number) => ({
        id: `p_${t}_${pi}`,
        title: p.title,
        nodes: (p.nodes || []).map((n: any, ni: number) => ({
          id: `n_${t}_${pi}_${ni}`,
          title: typeof n === "string" ? n : n.title,
        })),
      })),
    };
    return json(roadmap);
  } catch (e: any) {
    console.error("generate-roadmap failed:", e?.message);
    return json({ error: "Generation failed" }, 502);
  }
};
