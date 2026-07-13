import { supabase } from "./supabase";
import type { Roadmap, RoadmapNode } from "../types";

// Persistence layer. When a signed-in Supabase user is present, calls go to
// Supabase (RLS scopes each user to their own rows). Otherwise everything
// falls back to this browser's localStorage, so roadmaps + progress survive a
// refresh and populate "My Roadmap" with no account required (browser mode).

export interface SavedRoadmap {
  id: string;
  title: string;
  topic: string | null;
  data: Roadmap;
  updated_at: string;
}

// ── localStorage fallback (browser mode) ────────────────────────────
const LS_ROADMAPS = "openpath_roadmaps";
const LS_PROGRESS = "openpath_progress";
const isLocal = (id: string) => id.startsWith("local_");
const localId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function lsReadRoadmaps(): SavedRoadmap[] {
  try {
    return JSON.parse(localStorage.getItem(LS_ROADMAPS) || "[]");
  } catch {
    return [];
  }
}
function lsWriteRoadmaps(list: SavedRoadmap[]) {
  try {
    localStorage.setItem(LS_ROADMAPS, JSON.stringify(list));
  } catch (e) {
    console.error("saveRoadmap(local):", e);
  }
}
function lsReadProgress(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}");
  } catch {
    return {};
  }
}
function lsWriteProgress(map: Record<string, string[]>) {
  try {
    localStorage.setItem(LS_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error("setNodeComplete(local):", e);
  }
}

/** Insert a freshly generated roadmap. Returns the new id (Supabase when
 *  signed in, else a local id), or null only if it truly couldn't be saved. */
export async function saveRoadmap(roadmap: Roadmap): Promise<string | null> {
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data, error } = await supabase
        .from("roadmaps")
        .insert({
          user_id: auth.user.id,
          topic: roadmap.topic ?? null,
          title: roadmap.title,
          data: roadmap,
        })
        .select("id")
        .single();
      if (!error) return data.id;
      console.error("saveRoadmap:", error.message);
    }
  }
  // Browser mode: persist to this device's localStorage.
  const id = localId();
  const list = lsReadRoadmaps();
  list.unshift({
    id,
    title: roadmap.title,
    topic: roadmap.topic ?? null,
    data: roadmap,
    updated_at: new Date().toISOString(),
  });
  lsWriteRoadmaps(list);
  return id;
}

export interface UserProfile {
  referral_code: string;
  bonus_daily: number;
  plan: string;
  context: string | null;
  language: string;
}

/** Load the signed-in user's profile (personalization + referral state). */
export async function getMyProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("referral_code, bonus_daily, plan, context, language")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error("getMyProfile:", error.message);
    return null;
  }
  return data as UserProfile | null;
}

/** Save personalization context/language back to the profile for reuse. */
export async function updateMyPersonalization(
  context: string,
  language: string,
): Promise<void> {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { error } = await supabase
    .from("profiles")
    .update({ context: context || null, language: language || "English" })
    .eq("id", auth.user.id);
  if (error) console.error("updateMyPersonalization:", error.message);
}

/** Redeem a referral code (grants bonus quota to both parties, once). */
export async function redeemReferral(code: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("redeem_referral", { p_code: code });
  if (error) {
    console.error("redeemReferral:", error.message);
    return false;
  }
  return !!(data as any)?.ok;
}

export interface ReferralStats {
  count: number;
  bonus: number;
  code: string | null;
}

export async function getReferralStats(): Promise<ReferralStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_referral_stats");
  if (error) {
    console.error("getReferralStats:", error.message);
    return null;
  }
  return data as ReferralStats;
}

/** Mark a roadmap public so it can be shared by link. Returns success. */
export async function makeRoadmapPublic(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("roadmaps")
    .update({ is_public: true })
    .eq("id", id);
  if (error) {
    console.error("makeRoadmapPublic:", error.message);
    return false;
  }
  return true;
}

/** Persist roadmap mutations (e.g. "go deeper" nodes appended). */
export async function updateRoadmapData(id: string, roadmap: Roadmap): Promise<void> {
  if (supabase && !isLocal(id)) {
    const { error } = await supabase
      .from("roadmaps")
      .update({ data: roadmap, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("updateRoadmapData:", error.message);
    return;
  }
  const list = lsReadRoadmaps();
  const i = list.findIndex((r) => r.id === id);
  if (i >= 0) {
    list[i] = {
      ...list[i],
      title: roadmap.title,
      topic: roadmap.topic ?? list[i].topic,
      data: roadmap,
      updated_at: new Date().toISOString(),
    };
    lsWriteRoadmaps(list);
  }
}

/** List saved roadmaps, newest first (Supabase when signed in, else browser). */
export async function listRoadmaps(): Promise<SavedRoadmap[]> {
  if (supabase) {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("id, title, topic, data, updated_at")
        .order("updated_at", { ascending: false });
      if (!error) return (data ?? []) as SavedRoadmap[];
      console.error("listRoadmaps:", error.message);
    }
  }
  return lsReadRoadmaps();
}

/** Completed node ids for a roadmap. */
export async function loadProgress(roadmapId: string): Promise<string[]> {
  if (supabase && !isLocal(roadmapId)) {
    const { data, error } = await supabase
      .from("progress")
      .select("node_id")
      .eq("roadmap_id", roadmapId);
    if (error) {
      console.error("loadProgress:", error.message);
      return [];
    }
    return (data ?? []).map((r: { node_id: string }) => r.node_id);
  }
  return lsReadProgress()[roadmapId] ?? [];
}

export async function setNodeComplete(
  roadmapId: string,
  nodeId: string,
  complete: boolean,
): Promise<void> {
  if (supabase && !isLocal(roadmapId)) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    if (complete) {
      const { error } = await supabase
        .from("progress")
        .upsert(
          { user_id: auth.user.id, roadmap_id: roadmapId, node_id: nodeId },
          { onConflict: "roadmap_id,node_id" },
        );
      if (error) console.error("setNodeComplete(insert):", error.message);
    } else {
      const { error } = await supabase
        .from("progress")
        .delete()
        .eq("roadmap_id", roadmapId)
        .eq("node_id", nodeId);
      if (error) console.error("setNodeComplete(delete):", error.message);
    }
    return;
  }
  const map = lsReadProgress();
  const set = new Set(map[roadmapId] ?? []);
  if (complete) set.add(nodeId);
  else set.delete(nodeId);
  map[roadmapId] = [...set];
  lsWriteProgress(map);
}

/** Feedback hook: per-node "report issue / inaccurate". */
export async function submitFeedback(args: {
  roadmapId: string | null;
  node: RoadmapNode;
  pathTitle: string;
  reason: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;

  const { error } = await supabase.from("node_feedback").insert({
    user_id: auth.user.id,
    roadmap_id: args.roadmapId,
    node_id: args.node.id,
    node_title: args.node.title,
    path_title: args.pathTitle,
    reason: args.reason,
  });
  if (error) {
    console.error("submitFeedback:", error.message);
    return false;
  }
  return true;
}
