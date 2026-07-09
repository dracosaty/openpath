import type {
  Roadmap,
  Lesson,
  DeeperTopic,
  LearnerProfile,
  InterviewPrep,
} from "../types";
import {
  generateStubRoadmap,
  generateStubLesson,
  generateStubDeeper,
  generateStubInterviewPrep,
} from "./stub";
import { findPreset } from "../data/presetData";
import { supabase } from "./supabase";

// The Netlify Functions (/api/generate-*) are the real backend.
// Production ALWAYS uses the real backend (so deploys don't depend on an env
// flag). Local dev uses the stub by default (no backend needed) — opt out with
// VITE_USE_STUB=false, or force the stub anywhere with VITE_USE_STUB=true.
const USE_STUB = import.meta.env.PROD
  ? import.meta.env.VITE_USE_STUB === "true"
  : import.meta.env.VITE_USE_STUB !== "false";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJSON<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Attach the session token so the backend can apply per-user rate limits.
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    if (attempt < 2) {
      await sleep(500);
      return postJSON<T>(path, body, attempt + 1);
    }
    throw new Error("Network error");
  }
  if (res.ok) return res.json() as Promise<T>;
  // The free model endpoint is high-variance; a slow request that times out
  // (5xx) usually succeeds on a fresh attempt. Don't retry 429 (rate limit).
  if (res.status >= 500 && attempt < 2) {
    await sleep(500);
    return postJSON<T>(path, body, attempt + 1);
  }
  throw new Error(`API ${res.status}`);
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

export async function generateInterviewPrep(
  resume: string,
  jobDescription: string,
  targetRole: string,
  additionalContext: string,
): Promise<InterviewPrep> {
  if (USE_STUB) return generateStubInterviewPrep();
  return postJSON<InterviewPrep>("/api/generate-interview-prep", {
    mode: "personalized",
    resume,
    jobDescription,
    targetRole,
    additionalContext,
  });
}

/** No resume/JD needed — a quick general prep briefing for a domain, used by
 *  the "Explore interview topics" browser. */
export async function generateTopicInterviewPrep(topic: string): Promise<InterviewPrep> {
  if (USE_STUB) return generateStubInterviewPrep();
  return postJSON<InterviewPrep>("/api/generate-interview-prep", { mode: "topic", topic });
}
