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

  const system = `You are a curriculum designer. ${formatProfile(profile)} Respond ONLY with valid JSON.`;

  const userPrompt = `The learner just studied "${nodeTitle}" in the "${pathTitle}" path and wants to go deeper. Return ONLY a JSON array of 3 advanced sub-topics: [ { "title": "Sub-topic (max 5 words)" } ]`;

  return runGeneration({
    req,
    ip: getClientIp(req, context.ip),
    flow: "deeper",
    subject: `${pathTitle} :: ${nodeTitle}`,
    profile,
    produce: async () => {
      const arr = await callClaude(userPrompt, system, 1000);
      const t = Date.now();
      return (Array.isArray(arr) ? arr : [])
        .slice(0, 3)
        .map((e: any, i: number) => ({
          id: `d_${t}_${i}`,
          title: typeof e === "string" ? e : e.title,
        }));
    },
  });
};
