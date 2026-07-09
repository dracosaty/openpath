import type { InterviewPrep, LearnerProfile, Roadmap } from "../types";

/**
 * Turns an interview-prep learning plan into a real Roadmap — so "what you
 * need to learn to crack this interview" plugs directly into the existing
 * roadmap/lesson engine (RoadmapView, LessonPanel, progress, spaced-repetition
 * quiz review, sharing) with no new machinery. Lessons for each concept are
 * generated on demand, exactly like any other roadmap.
 */
export function buildInterviewRoadmap(
  prep: InterviewPrep,
  targetRole: string,
  additionalContext: string,
): Roadmap {
  const t = Date.now();
  const label = targetRole.trim() || "your interview";
  return {
    id: `interview_${t}`,
    title: `Interview prep: ${label}`,
    description:
      prep.summary || `A focused study plan to close the gaps for ${label}.`,
    level: "Interview prep",
    timeEstimate: "Focus on this before your interview",
    outcomes: prep.gaps.slice(0, 4).map((g) => `Close this gap: ${g}`),
    phases: prep.learningPlan.map((area, pi) => ({
      id: `p_${t}_${pi}`,
      title: area.title,
      nodes: area.nodes.map((n, ni) => ({ id: `n_${t}_${pi}_${ni}`, title: n })),
    })),
    topic: label,
    profile: {
      familiarity: "Targeted — preparing for a specific interview",
      goal: `Be ready for the ${label} interview`,
      pace: "Balanced depth",
      context: additionalContext || undefined,
    } satisfies LearnerProfile,
  };
}
