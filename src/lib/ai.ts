import type {
  Roadmap,
  Lesson,
  DeeperTopic,
  LearnerProfile,
} from "../types";
import { generateStubRoadmap, generateStubLesson, generateStubDeeper } from "./stub";
import { findPreset } from "../data/presetData";
import { supabase } from "./supabase";
import { getApiKey } from "./byok";

// The Netlify Functions (/api/generate-*) hold the Anthropic key server-side.
// The stub remains the default so `npm run dev` works with no key; set
// VITE_USE_STUB=false (e.g. under `netlify dev`) to hit the real backend.
const USE_STUB = import.meta.env.VITE_USE_STUB !== "false";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Attach the session token so the backend can apply per-user rate limits.
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  // BYOK: forward the user's own key (browser-only) for unlimited, self-funded use.
  const byok = getApiKey();
  if (byok) headers["X-User-Anthropic-Key"] = byok;
  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function generateRoadmap(
  topic: string,
  profile: LearnerProfile,
): Promise<Roadmap> {
  if (USE_STUB) return generateStubRoadmap(topic, profile);
  // Use pre-baked structure for known presets — no API call needed.
  const preset = findPreset(topic);
  if (preset) return { ...preset, topic, profile };
  const rm = await postJSON<Roadmap>("/api/generate-roadmap", { topic, profile });
  // The server returns a pure roadmap; attach identity the client/UI relies on.
  return { ...rm, topic, profile };
}

export async function generateLesson(
  nodeTitle: string,
  pathTitle: string,
  profile: LearnerProfile,
): Promise<Lesson> {
  if (USE_STUB) return generateStubLesson(nodeTitle);
  return postJSON<Lesson>("/api/generate-lesson", {
    nodeTitle,
    pathTitle,
    profile,
  });
}

export async function generateDeeper(
  nodeTitle: string,
  pathTitle: string,
  profile: LearnerProfile,
): Promise<DeeperTopic[]> {
  if (USE_STUB) return generateStubDeeper(nodeTitle);
  return postJSON<DeeperTopic[]>("/api/generate-deeper", {
    nodeTitle,
    pathTitle,
    profile,
  });
}
