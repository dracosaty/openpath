import type { Roadmap } from "../types";

// Mock "from the community" shared roadmaps. These power the social/explore
// section on the landing page and open in the read-only PublicRoadmap view
// (same conversion loop as a real shared link). Replace with live data later.
export interface CommunityCourse {
  roadmap: Roadmap;
  author: string;
  avatarColor: string;
  learners: number;
}

function phases(groups: [string, string[]][]) {
  return groups.map(([title, nodes], pi) => ({
    id: `cp_${pi}`,
    title,
    nodes: nodes.map((t, ni) => ({ id: `cn_${pi}_${ni}`, title: t })),
  }));
}

export const COMMUNITY: CommunityCourse[] = [
  {
    author: "Aarav",
    avatarColor: "#0e7c66",
    learners: 1284,
    roadmap: {
      id: "community-ml",
      topic: "Machine Learning",
      title: "Machine Learning from Scratch",
      description: "Go from linear algebra basics to training and shipping your own models.",
      level: "Intermediate",
      timeEstimate: "8 weeks at 45 min/day",
      outcomes: [
        "Explain how gradient descent trains a model",
        "Build a classifier end-to-end in Python",
        "Evaluate and avoid overfitting",
      ],
      phases: phases([
        ["Math foundations", ["Vectors & matrices", "Derivatives", "Probability basics"]],
        ["Core ML", ["Linear regression", "Logistic regression", "Gradient descent"]],
        ["Real models", ["Decision trees", "Neural nets", "Train & evaluate"]],
      ]),
    },
  },
  {
    author: "Meera",
    avatarColor: "#7c5cfc",
    learners: 942,
    roadmap: {
      id: "community-finance",
      topic: "Personal Finance",
      title: "Personal Finance for Beginners",
      description: "Budget, save, and start investing with confidence — no jargon.",
      level: "Beginner",
      timeEstimate: "3 weeks at 20 min/day",
      outcomes: [
        "Build a monthly budget that sticks",
        "Choose the right savings & investment accounts",
        "Avoid the most common money traps",
      ],
      phases: phases([
        ["Money basics", ["Income vs expenses", "Budgeting 101", "Emergency fund"]],
        ["Growing money", ["Compound interest", "Index funds", "Risk & return"]],
      ]),
    },
  },
  {
    author: "Diego",
    avatarColor: "#b45309",
    learners: 2107,
    roadmap: {
      id: "community-spanish",
      topic: "Spanish",
      title: "Conversational Spanish in 30 Days",
      description: "Practical Spanish for travel and everyday conversation.",
      level: "Beginner",
      timeEstimate: "30 days at 25 min/day",
      outcomes: [
        "Hold a basic conversation with a native speaker",
        "Order food and ask for directions",
        "Understand 500+ everyday words",
      ],
      phases: phases([
        ["Survival Spanish", ["Greetings", "Numbers & time", "Common phrases"]],
        ["Daily life", ["Food & dining", "Directions", "Shopping"]],
      ]),
    },
  },
  {
    author: "Sophie",
    avatarColor: "#c2410c",
    learners: 768,
    roadmap: {
      id: "community-design",
      topic: "UI/UX Design",
      title: "UI/UX Design Fundamentals",
      description: "Design digital products people love, from principles to portfolio.",
      level: "Beginner",
      timeEstimate: "6 weeks at 40 min/day",
      outcomes: [
        "Apply core visual hierarchy & layout principles",
        "Run a simple user research session",
        "Ship a polished case study for your portfolio",
      ],
      phases: phases([
        ["Principles", ["Hierarchy", "Color & type", "Spacing & grids"]],
        ["Process", ["User research", "Wireframing", "Prototyping"]],
      ]),
    },
  },
  {
    author: "Ken",
    avatarColor: "#0e7c66",
    learners: 1530,
    roadmap: {
      id: "community-quantum",
      topic: "Quantum Computing",
      title: "Quantum Computing, Demystified",
      description: "From qubits to your first quantum algorithm — intuition first.",
      level: "Intermediate",
      timeEstimate: "6 weeks at 30 min/day",
      outcomes: [
        "Explain superposition and entanglement clearly",
        "Read a basic quantum circuit",
        "Run an algorithm on a simulator",
      ],
      phases: phases([
        ["Foundations", ["What is a qubit?", "Superposition", "Measurement"]],
        ["Going quantum", ["Entanglement", "Quantum gates", "Circuits"]],
      ]),
    },
  },
  {
    author: "Priya",
    avatarColor: "#7c5cfc",
    learners: 611,
    roadmap: {
      id: "community-photography",
      topic: "Photography",
      title: "Photography: Master Your Camera",
      description: "Shoot stunning photos by understanding light, exposure, and composition.",
      level: "Beginner",
      timeEstimate: "4 weeks at 30 min/day",
      outcomes: [
        "Shoot confidently in manual mode",
        "Compose striking, balanced photos",
        "Edit photos to a professional finish",
      ],
      phases: phases([
        ["Exposure", ["Aperture", "Shutter speed", "ISO"]],
        ["The art", ["Composition", "Light", "Editing basics"]],
      ]),
    },
  },
];
