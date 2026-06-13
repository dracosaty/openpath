import type {
  Roadmap,
  Lesson,
  DeeperTopic,
  LearnerProfile,
} from "../types";
import { generateStubRoadmap, generateStubLesson, generateStubDeeper } from "./stub";

// ── Step 1 (skeleton): no backend exists yet, so we serve generated
// placeholder content from ./stub. In Step 2 we point these three calls at
// the Netlify Functions (/api/generate-*) which hold the Anthropic key
// server-side. Flip USE_STUB to false (or set VITE_USE_STUB=false) then.
const USE_STUB = import.meta.env.VITE_USE_STUB !== "false";

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  return postJSON<Roadmap>("/api/generate-roadmap", { topic, profile });
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
