import type { Diagram as DiagramType } from "../types";

// Renders the structured diagram spec the lesson flow returns as a native
// SVG-free layout (flow / cycle / comparison / pyramid). Kept simple and
// dependency-free; styling leans on the ported design tokens.
export default function Diagram({ d }: { d: DiagramType }) {
  return (
    <figure className="op-diagram">
      <figcaption
        style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-60)", marginBottom: 10 }}
      >
        {d.title}
      </figcaption>

      {d.type === "comparison" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Col label={d.colA} items={d.items.slice(0, Math.ceil(d.items.length / 2))} />
          <Col label={d.colB} items={d.items.slice(Math.ceil(d.items.length / 2))} />
        </div>
      ) : (
        <div className="diagram-stack">
          {d.items.map((it, i) => (
            <div key={i} className="diagram-stack-item">
              <Box label={it.label} detail={it.detail} />
              {i < d.items.length - 1 && d.type !== "pyramid" && (
                <span className="diagram-connector">{d.type === "cycle" ? "↻" : "↓"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

function Box({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="diagram-box">
      <div className="db-label">{label}</div>
      {detail && <div className="db-detail">{detail}</div>}
    </div>
  );
}

function Col({ label, items }: { label?: string; items: DiagramType["items"] }) {
  return (
    <div>
      {label && (
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{label}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it, i) => (
          <Box key={i} label={it.label} detail={it.detail} />
        ))}
      </div>
    </div>
  );
}
