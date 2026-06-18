import type { Roadmap } from "../types";

interface Props {
  roadmap: Roadmap;
  variant?: "share" | "complete";
}

/**
 * The screenshot-worthy artifact people post. On-brand (design tokens + the
 * display font), 2:1 so it crops well on social. Used in the share sheet and
 * the completion celebration.
 */
export default function ShareCard({ roadmap, variant = "share" }: Props) {
  const nodeCount = roadmap.phases.reduce((n, p) => n + p.nodes.length, 0);
  const done = variant === "complete";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "2 / 1",
        background: done ? "var(--accent)" : "var(--paper-2)",
        color: done ? "#fff" : "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: 14,
        boxShadow: "4px 4px 0 var(--ink)",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 14 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: done ? "#fff" : "var(--accent)",
            display: "inline-block",
          }}
        />
        OpenPath
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          {done ? "Completed a roadmap" : "AI-built learning roadmap"}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(22px, 4.4vw, 38px)",
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {done ? "✓ " : ""}
          {roadmap.title}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 13, fontWeight: 700 }}>
        <span>{roadmap.level}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{roadmap.phases.length} phases</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{nodeCount} lessons</span>
        {roadmap.timeEstimate && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>{roadmap.timeEstimate}</span>
          </>
        )}
      </div>
    </div>
  );
}
