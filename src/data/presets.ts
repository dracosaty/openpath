import type { Roadmap } from "../types";

// Seed "Popular roadmaps" shown on the Explore page, ported from the
// prototype. In the prototype these shipped with fully pre-baked lessons;
// here we keep titles/structure and let lessons generate on demand. The
// full pre-baked lesson content can be reintroduced later as a JSON import.
export interface PresetCard {
  id: string;
  title: string;
  description: string;
  level: string;
}

export const SUGGESTIONS = [
  "Quantum computing",
  "Spanish for travel",
  "Guitar basics",
  "Machine learning",
  "Indian history",
  "Public speaking",
];

export const PRESETS: PresetCard[] = [
  {
    id: "preset-python",
    title: "Python Programming",
    description:
      "Go from zero to writing real programs, scripts and small apps in Python.",
    level: "Beginner",
  },
  {
    id: "preset-cbse-science",
    title: "Class 10 Science (CBSE)",
    description:
      "Complete board-exam-ready coverage of the Class 10 NCERT science syllabus.",
    level: "Beginner",
  },
  {
    id: "preset-finance",
    title: "Personal Finance",
    description:
      "Understand money: budgeting, saving, investing and avoiding common traps.",
    level: "Beginner",
  },
  {
    id: "preset-uiux",
    title: "UI/UX Design",
    description:
      "Learn to design digital products people love — from principles to portfolio.",
    level: "Beginner",
  },
];

export type { Roadmap };
