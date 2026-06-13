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

  const nodeTitle = clampStr(payload?.nodeTitle, 200);
  const pathTitle = clampStr(payload?.pathTitle, 200);
  const profile = payload?.profile;
  if (!nodeTitle || !pathTitle) return json({ error: "Missing nodeTitle/pathTitle" }, 400);
  if (!isProfile(profile)) return json({ error: "Missing or invalid profile" }, 400);

  const system = `You are a curriculum designer. ${formatProfile(profile)} Respond ONLY with valid JSON.`;

  const userPrompt = `The learner just studied "${nodeTitle}" in the "${pathTitle}" path and wants to go deeper. Return ONLY a JSON array of 3 advanced sub-topics: [ { "title": "Sub-topic (max 5 words)" } ]`;

  try {
    const arr = await callClaude(userPrompt, system, 1000);
    const t = Date.now();
    const topics = (Array.isArray(arr) ? arr : [])
      .slice(0, 3)
      .map((e: any, i: number) => ({
        id: `d_${t}_${i}`,
        title: typeof e === "string" ? e : e.title,
      }));
    return json(topics);
  } catch (e: any) {
    console.error("generate-deeper failed:", e?.message);
    return json({ error: "Generation failed" }, 502);
  }
};
