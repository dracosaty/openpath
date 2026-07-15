export interface InterviewTopic {
  id: string;
  title: string;
  icon: string;
  blurb: string;
}

/** Curated domains for the "Explore interview topics" browser — no resume or
 *  JD needed, a quick way to see the kind of prep ZenWise produces. */
export const INTERVIEW_TOPICS: InterviewTopic[] = [
  { id: "swe", title: "Software Engineering", icon: "💻", blurb: "Coding, system design, and engineering behavioral rounds." },
  { id: "pm", title: "Product Management", icon: "🧭", blurb: "Product sense, execution, and strategy questions." },
  { id: "data", title: "Data Science / ML", icon: "📊", blurb: "Modeling, statistics, and applied ML case questions." },
  { id: "consulting", title: "Consulting case interviews", icon: "🧩", blurb: "Case structuring, market sizing, and business judgment." },
  { id: "design", title: "Product Design (UX/UI)", icon: "🎨", blurb: "Portfolio walkthroughs and design-thinking questions." },
  { id: "sales", title: "Sales", icon: "📈", blurb: "Pipeline, objection handling, and closing scenarios." },
  { id: "finance", title: "Finance / Investment banking", icon: "💰", blurb: "Technical finance, valuation, and fit questions." },
  { id: "behavioral", title: "Behavioral (any role)", icon: "🗣️", blurb: "STAR-method questions that show up across every role." },
];
