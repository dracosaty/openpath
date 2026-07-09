// Shared domain types for OpenPath.
// These mirror the JSON shapes the AI flows return so the same types are
// used by the views, the AI client, and (later) the serverless functions.

export type View = "home" | "roadmap" | "review" | "exam" | "vault" | "interview";

/** The calibration answers + optional context that personalise every generation. */
export interface LearnerProfile {
  familiarity: string;
  goal: string;
  pace: string;
  /** Optional free-text background (resume / current level / curriculum, e.g. "CBSE class 10"). */
  context?: string;
  /** Output language for roadmap + lessons. Defaults to English. */
  language?: string;
}

export interface DiagramItem {
  label: string;
  detail?: string;
}

export interface Diagram {
  type: "flow" | "cycle" | "comparison" | "pyramid";
  title: string;
  items: DiagramItem[];
  colA?: string;
  colB?: string;
}

export interface KeyTerm {
  term: string;
  def: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: string;
}

export interface Lesson {
  lessonText: string;
  example: string;
  diagram: Diagram;
  keyTerms: KeyTerm[];
  funFact: string;
  quiz: QuizQuestion[];
}

export interface RoadmapNode {
  id: string;
  title: string;
  /** Pre-baked lesson for preset roadmaps; AI-generated lessons are cached separately. */
  lesson?: Lesson;
}

export interface Phase {
  id: string;
  title: string;
  nodes: RoadmapNode[];
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  level: string;
  timeEstimate?: string;
  outcomes: string[];
  phases: Phase[];
  /** The topic string the learner typed (used as cache/identity key). */
  topic?: string;
  /** The profile the roadmap was generated for. */
  profile?: LearnerProfile;
}

export interface DeeperTopic {
  id: string;
  title: string;
}

export interface InterviewQuestion {
  id: string;
  category: "Behavioral" | "Technical" | "Role-specific" | "Questions to ask them";
  q: string;
  tip: string;
}

/** A focus area in the study plan: what to learn, before it's turned into a
 *  full Roadmap (see src/lib/interviewRoadmap.ts). */
export interface LearningPlanArea {
  title: string;
  nodes: string[];
}

export interface InterviewPrep {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  talkingPoints: string[];
  learningPlan: LearningPlanArea[];
  questions: InterviewQuestion[];
}
