// The 3 fixed calibration questions, ported verbatim from the prototype.
export interface CalibrationQuestion {
  key: "familiarity" | "goal" | "pace";
  q: string;
  opts: string[];
}

export const CALIBRATION_QUESTIONS: CalibrationQuestion[] = [
  {
    key: "familiarity",
    q: "How familiar are you with this topic?",
    opts: [
      "Complete beginner",
      "Know the basics",
      "Fairly comfortable",
      "Advanced — fill my gaps",
    ],
  },
  {
    key: "goal",
    q: "What’s your goal?",
    opts: [
      "Curiosity / general knowledge",
      "School or exam prep",
      "Career / professional skill",
      "Build something specific",
    ],
  },
  {
    key: "pace",
    q: "How do you like to learn?",
    opts: ["Short & simple explanations", "Balanced depth", "Deep & rigorous"],
  },
];
