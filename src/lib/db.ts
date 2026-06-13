import { supabase } from "./supabase";
import type { Roadmap, RoadmapNode } from "../types";

// Persistence layer. All calls go directly to Supabase from the browser using
// the user's session; Row-Level Security guarantees a user only ever touches
// their own rows. Every function no-ops (or returns empty) when there is no
// configured Supabase / no signed-in user, so the UI works in no-account mode.

export interface SavedRoadmap {
  id: string;
  title: string;
  topic: string | null;
  data: Roadmap;
  updated_at: string;
}

/** Insert a freshly generated roadmap. Returns the new DB id, or null if not saved. */
export async function saveRoadmap(roadmap: Roadmap): Promise<string | null> {
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

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
  if (error) {
    console.error("saveRoadmap:", error.message);
    return null;
  }
  return data.id;
}

/** Persist roadmap mutations (e.g. "go deeper" nodes appended). */
export async function updateRoadmapData(id: string, roadmap: Roadmap): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("roadmaps")
    .update({ data: roadmap, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("updateRoadmapData:", error.message);
}

/** List the signed-in user's saved roadmaps, newest first. */
export async function listRoadmaps(): Promise<SavedRoadmap[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("roadmaps")
    .select("id, title, topic, data, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("listRoadmaps:", error.message);
    return [];
  }
  return (data ?? []) as SavedRoadmap[];
}

/** Completed node ids for a roadmap. */
export async function loadProgress(roadmapId: string): Promise<string[]> {
  if (!supabase) return [];
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

export async function setNodeComplete(
  roadmapId: string,
  nodeId: string,
  complete: boolean,
): Promise<void> {
  if (!supabase) return;
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
