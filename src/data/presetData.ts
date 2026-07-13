import type { Roadmap } from "../types";

type PresetRoadmap = Omit<Roadmap, "topic" | "profile">;

const python: PresetRoadmap = {
  id: "rm_preset_python",
  title: "Python Programming",
  description: "Go from zero to writing real programs, scripts and small apps in Python.",
  level: "Beginner",
  timeEstimate: "6–8 weeks at 30 min/day",
  outcomes: [
    "Write Python scripts that automate everyday tasks",
    "Build and run your own command-line applications",
    "Read and write data from files and web APIs",
    "Apply object-oriented concepts in your own projects",
  ],
  phases: [
    {
      id: "p_python_0",
      title: "Python Fundamentals",
      nodes: [
        { id: "n_python_0_0", title: "Setup & Your First Script" },
        { id: "n_python_0_1", title: "Variables & Data Types" },
        { id: "n_python_0_2", title: "Operators & Expressions" },
        { id: "n_python_0_3", title: "User Input & Print Output" },
      ],
    },
    {
      id: "p_python_1",
      title: "Control Flow & Functions",
      nodes: [
        { id: "n_python_1_0", title: "If / Elif / Else Statements" },
        { id: "n_python_1_1", title: "For & While Loops" },
        { id: "n_python_1_2", title: "Defining & Calling Functions" },
        { id: "n_python_1_3", title: "Scope & Return Values" },
      ],
    },
    {
      id: "p_python_2",
      title: "Data Structures",
      nodes: [
        { id: "n_python_2_0", title: "Lists & Slicing" },
        { id: "n_python_2_1", title: "Dictionaries & Sets" },
        { id: "n_python_2_2", title: "Tuples & Immutability" },
        { id: "n_python_2_3", title: "List Comprehensions" },
      ],
    },
    {
      id: "p_python_3",
      title: "Files, Errors & Packages",
      nodes: [
        { id: "n_python_3_0", title: "Reading & Writing Files" },
        { id: "n_python_3_1", title: "Error Handling with Try/Except" },
        { id: "n_python_3_2", title: "Standard Library Modules" },
        { id: "n_python_3_3", title: "Installing Packages with pip" },
      ],
    },
    {
      id: "p_python_4",
      title: "Object-Oriented Python & Projects",
      nodes: [
        { id: "n_python_4_0", title: "Classes & Objects" },
        { id: "n_python_4_1", title: "Inheritance & Methods" },
        { id: "n_python_4_2", title: "Build a CLI App" },
        { id: "n_python_4_3", title: "Fetch Data from a Web API" },
      ],
    },
  ],
};

const cbseScience: PresetRoadmap = {
  id: "rm_preset_cbse_science",
  title: "Class 10 Science (CBSE)",
  description: "Complete board-exam-ready coverage of the Class 10 NCERT science syllabus.",
  level: "Beginner",
  timeEstimate: "10–12 weeks at 45 min/day",
  outcomes: [
    "Solve NCERT and board-level problems across Physics, Chemistry and Biology",
    "Explain core concepts with diagrams and examples",
    "Apply scientific reasoning to real-world scenarios",
    "Confidently attempt the Class 10 board science paper",
  ],
  phases: [
    {
      id: "p_cbse_0",
      title: "Physics: Light & Electricity",
      nodes: [
        { id: "n_cbse_0_0", title: "Reflection of Light & Mirrors" },
        { id: "n_cbse_0_1", title: "Refraction of Light & Lenses" },
        { id: "n_cbse_0_2", title: "The Human Eye & Defects" },
        { id: "n_cbse_0_3", title: "Electricity & Ohm's Law" },
        { id: "n_cbse_0_4", title: "Magnetic Effects of Current" },
      ],
    },
    {
      id: "p_cbse_1",
      title: "Chemistry: Reactions & Materials",
      nodes: [
        { id: "n_cbse_1_0", title: "Chemical Reactions & Equations" },
        { id: "n_cbse_1_1", title: "Acids, Bases & Salts" },
        { id: "n_cbse_1_2", title: "Metals & Non-metals" },
        { id: "n_cbse_1_3", title: "Carbon & Its Compounds" },
        { id: "n_cbse_1_4", title: "Periodic Classification of Elements" },
      ],
    },
    {
      id: "p_cbse_2",
      title: "Biology: Life Processes",
      nodes: [
        { id: "n_cbse_2_0", title: "Life Processes: Nutrition & Respiration" },
        { id: "n_cbse_2_1", title: "Transportation & Excretion" },
        { id: "n_cbse_2_2", title: "Control & Coordination" },
        { id: "n_cbse_2_3", title: "Reproduction in Organisms" },
        { id: "n_cbse_2_4", title: "Heredity & Evolution" },
      ],
    },
    {
      id: "p_cbse_3",
      title: "Environment & Natural Resources",
      nodes: [
        { id: "n_cbse_3_0", title: "Our Environment & Ecosystems" },
        { id: "n_cbse_3_1", title: "Management of Natural Resources" },
        { id: "n_cbse_3_2", title: "Sources of Energy" },
      ],
    },
  ],
};

const personalFinance: PresetRoadmap = {
  id: "rm_preset_finance",
  title: "Personal Finance",
  description: "Understand money: budgeting, saving, investing and avoiding common traps.",
  level: "Beginner",
  timeEstimate: "4–6 weeks at 30 min/day",
  outcomes: [
    "Build and stick to a monthly budget that actually works",
    "Eliminate high-interest debt using proven strategies",
    "Invest confidently in stocks, mutual funds and index funds",
    "Plan for retirement and major life milestones",
  ],
  phases: [
    {
      id: "p_finance_0",
      title: "Money Foundations",
      nodes: [
        { id: "n_finance_0_0", title: "The Money Mindset" },
        { id: "n_finance_0_1", title: "Budgeting: 50/30/20 Rule" },
        { id: "n_finance_0_2", title: "Building an Emergency Fund" },
        { id: "n_finance_0_3", title: "Banking & Account Types" },
      ],
    },
    {
      id: "p_finance_1",
      title: "Debt & Credit",
      nodes: [
        { id: "n_finance_1_0", title: "Understanding Credit Scores" },
        { id: "n_finance_1_1", title: "Good Debt vs. Bad Debt" },
        { id: "n_finance_1_2", title: "Debt Snowball & Avalanche Methods" },
        { id: "n_finance_1_3", title: "Credit Cards: Use & Avoid Traps" },
      ],
    },
    {
      id: "p_finance_2",
      title: "Saving & Investing",
      nodes: [
        { id: "n_finance_2_0", title: "How Compound Interest Works" },
        { id: "n_finance_2_1", title: "Stock Market Basics" },
        { id: "n_finance_2_2", title: "Index Funds & Mutual Funds" },
        { id: "n_finance_2_3", title: "Tax-advantaged Accounts (401k, IRA)" },
        { id: "n_finance_2_4", title: "Risk vs. Return & Diversification" },
      ],
    },
    {
      id: "p_finance_3",
      title: "Protection & Long-term Planning",
      nodes: [
        { id: "n_finance_3_0", title: "Insurance Essentials" },
        { id: "n_finance_3_1", title: "Retirement Planning" },
        { id: "n_finance_3_2", title: "Setting & Funding Life Goals" },
        { id: "n_finance_3_3", title: "Estate Planning Basics" },
      ],
    },
  ],
};

const uiux: PresetRoadmap = {
  id: "rm_preset_uiux",
  title: "UI/UX Design",
  description: "Learn to design digital products people love — from principles to portfolio.",
  level: "Beginner",
  timeEstimate: "8–10 weeks at 45 min/day",
  outcomes: [
    "Apply design fundamentals: color, typography and layout to real screens",
    "Conduct user research and translate findings into design decisions",
    "Build interactive prototypes in Figma",
    "Present a case-study portfolio ready for junior design roles",
  ],
  phases: [
    {
      id: "p_uiux_0",
      title: "Visual Design Fundamentals",
      nodes: [
        { id: "n_uiux_0_0", title: "Color Theory for Digital Products" },
        { id: "n_uiux_0_1", title: "Typography & Readability" },
        { id: "n_uiux_0_2", title: "Layout, Grids & White Space" },
        { id: "n_uiux_0_3", title: "Visual Hierarchy & Contrast" },
      ],
    },
    {
      id: "p_uiux_1",
      title: "UX Research & Strategy",
      nodes: [
        { id: "n_uiux_1_0", title: "What is UX? Process Overview" },
        { id: "n_uiux_1_1", title: "User Research Methods" },
        { id: "n_uiux_1_2", title: "User Personas & Journey Maps" },
        { id: "n_uiux_1_3", title: "Usability Heuristics (Nielsen)" },
        { id: "n_uiux_1_4", title: "Information Architecture" },
      ],
    },
    {
      id: "p_uiux_2",
      title: "Design Tools & Prototyping",
      nodes: [
        { id: "n_uiux_2_0", title: "Figma Essentials" },
        { id: "n_uiux_2_1", title: "Wireframing & Low-fi Prototypes" },
        { id: "n_uiux_2_2", title: "High-fidelity Mockups" },
        { id: "n_uiux_2_3", title: "Interactive Prototyping & Testing" },
        { id: "n_uiux_2_4", title: "Design Systems & Component Libraries" },
      ],
    },
    {
      id: "p_uiux_3",
      title: "Portfolio & Professional Practice",
      nodes: [
        { id: "n_uiux_3_0", title: "Accessibility (WCAG Basics)" },
        { id: "n_uiux_3_1", title: "Developer Handoff" },
        { id: "n_uiux_3_2", title: "Writing a UX Case Study" },
        { id: "n_uiux_3_3", title: "Building Your Portfolio" },
      ],
    },
  ],
};

// Map of normalized topic title → pre-baked roadmap.
// Add entries for any topic you want to skip the AI call for.
const PRESET_MAP: Record<string, PresetRoadmap> = {
  "python programming": python,
  "class 10 science (cbse)": cbseScience,
  "personal finance": personalFinance,
  "ui/ux design": uiux,
};

export function findPreset(topic: string): PresetRoadmap | null {
  return PRESET_MAP[topic.trim().toLowerCase()] ?? null;
}
