import { json, methodGuard, getClientIp } from "./_shared";
import { createClient } from "@supabase/supabase-js";

// Returns a public (is_public = true) roadmap by id, with owner fields stripped.
// Service-role read so we never open broad anon access to the roadmaps table.
// Also bumps the share "view" counter for virality analytics.
export default async (req: Request): Promise<Response> => {
  // Accept GET (?id=) so the URL is shareable/cacheable.
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let id = new URL(req.url).searchParams.get("id") || "";
  if (!id && req.method === "POST") {
    id = (await req.json().catch(() => ({})))?.id || "";
  }
  if (!id) return json({ error: "Missing id" }, 400);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ error: "Sharing not configured" }, 503);

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("roadmaps")
    .select("id, title, topic, data, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("get-public-roadmap:", error.message);
    return json({ error: "Lookup failed" }, 502);
  }
  if (!data) return json({ error: "Not found" }, 404);

  // Fire-and-forget view counter (don't block the response).
  db.rpc("bump_share_metric", { p_roadmap_id: id, p_metric: "view" }).then(
    () => {},
    () => {},
  );

  const rm = data.data as any;
  // Strip per-node lesson content — public viewers generate their own lessons.
  const sanitized = {
    id: data.id,
    title: rm.title,
    topic: data.topic,
    description: rm.description,
    level: rm.level,
    timeEstimate: rm.timeEstimate,
    outcomes: rm.outcomes ?? [],
    phases: (rm.phases ?? []).map((p: any) => ({
      id: p.id,
      title: p.title,
      nodes: (p.nodes ?? []).map((n: any) => ({ id: n.id, title: n.title })),
    })),
    public: true,
  };

  // Cache at the CDN for a few minutes — shared links get hammered.
  return new Response(JSON.stringify(sanitized), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "X-Client-IP": getClientIp(req),
    },
  });
};
