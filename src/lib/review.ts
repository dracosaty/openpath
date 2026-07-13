import { supabase } from "./supabase";
import { schedule, DEFAULT_SRS, type Grade } from "./srs";

// Unified review store. Signed-in users persist to Supabase (cross-device);
// everyone else persists to localStorage (device-local) so spaced repetition
// works without an account.

export interface ReviewItem {
  id: string;
  roadmapId: string | null;
  nodeId: string;
  nodeTitle: string;
  question: string;
  options: string[];
  answer: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
}

export interface NewReviewItem {
  roadmapId: string | null;
  nodeId: string;
  nodeTitle: string;
  question: string;
  options: string[];
  answer: string;
}

const LS_KEY = "openpath_reviews";
const itemKey = (nodeId: string, question: string) => `${nodeId}::${question}`;

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ── localStorage backend ────────────────────────────────────────────
function lsLoad(): ReviewItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}
function lsSave(items: ReviewItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

// ── public API ──────────────────────────────────────────────────────

/** Add quiz questions as review cards (deduped by node+question). */
export async function enqueueReviews(news: NewReviewItem[]): Promise<void> {
  if (news.length === 0) return;
  const uid = await currentUserId();

  if (uid && supabase) {
    const rows = news.map((n) => ({
      user_id: uid,
      roadmap_id: n.roadmapId,
      node_id: n.nodeId,
      node_title: n.nodeTitle,
      question: n.question,
      options: n.options,
      answer: n.answer,
      ...DEFAULT_SRS,
      due_at: new Date().toISOString(),
    }));
    // ignoreDuplicates so re-answering doesn't reset an existing card's schedule.
    const { error } = await supabase
      .from("review_items")
      .upsert(rows, { onConflict: "user_id,node_id,question", ignoreDuplicates: true });
    if (error) console.error("enqueueReviews:", error.message);
    return;
  }

  const items = lsLoad();
  const seen = new Set(items.map((i) => itemKey(i.nodeId, i.question)));
  let added = false;
  for (const n of news) {
    if (seen.has(itemKey(n.nodeId, n.question))) continue;
    items.push({
      id: `rv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...n,
      ...DEFAULT_SRS,
      dueAt: new Date().toISOString(),
    });
    seen.add(itemKey(n.nodeId, n.question));
    added = true;
  }
  if (added) lsSave(items);
}

/** Items due now, oldest-due first. */
export async function getDueReviews(): Promise<ReviewItem[]> {
  const now = new Date().toISOString();
  const uid = await currentUserId();

  if (uid && supabase) {
    const { data, error } = await supabase
      .from("review_items")
      .select("*")
      .lte("due_at", now)
      .order("due_at", { ascending: true });
    if (error) {
      console.error("getDueReviews:", error.message);
      return [];
    }
    return (data ?? []).map(fromRow);
  }

  return lsLoad()
    .filter((i) => i.dueAt <= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

/** {due, total} counts for the nav badge. */
export async function getReviewCounts(): Promise<{ due: number; total: number }> {
  const now = new Date().toISOString();
  const uid = await currentUserId();

  if (uid && supabase) {
    const total = await supabase.from("review_items").select("id", { count: "exact", head: true });
    const due = await supabase
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .lte("due_at", now);
    return { due: due.count ?? 0, total: total.count ?? 0 };
  }

  const items = lsLoad();
  return { due: items.filter((i) => i.dueAt <= now).length, total: items.length };
}

/** Grade a card and persist its next schedule. */
export async function gradeReview(item: ReviewItem, grade: Grade): Promise<void> {
  const next = schedule(item, grade);
  const uid = await currentUserId();

  if (uid && supabase) {
    const { error } = await supabase
      .from("review_items")
      .update({
        ease: next.ease,
        interval_days: next.intervalDays,
        repetitions: next.repetitions,
        due_at: next.dueAt,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    if (error) console.error("gradeReview:", error.message);
    return;
  }

  const items = lsLoad();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...next };
    lsSave(items);
  }
}

function fromRow(r: any): ReviewItem {
  return {
    id: r.id,
    roadmapId: r.roadmap_id,
    nodeId: r.node_id,
    nodeTitle: r.node_title,
    question: r.question,
    options: r.options ?? [],
    answer: r.answer,
    ease: r.ease,
    intervalDays: r.interval_days,
    repetitions: r.repetitions,
    dueAt: r.due_at,
  };
}
