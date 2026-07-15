import type { Roadmap } from "../types";

interface Props {
  roadmap: Roadmap;
  onCreateOwn: (topic: string) => void;
  onExplore: () => void;
}

/**
 * Read-only roadmap shown to anyone who opens a shared link (no auth).
 * The whole point is conversion: a prominent "create your own" CTA turns a
 * viewer into a creator — closing the viral loop.
 */
export default function PublicRoadmap({ roadmap, onCreateOwn, onExplore }: Props) {
  const topic = roadmap.topic ?? roadmap.title;

  return (
    <div className="rm-page">
      <button className="nav-link" onClick={onExplore}>
        ZenWise — learn anything, free →
      </button>

      <div className="rm-header" style={{ marginTop: 8 }}>
        <div className="lp-eyebrow">Shared roadmap</div>
        <h1>{roadmap.title}</h1>
        <p className="rm-desc">{roadmap.description}</p>
        <div className="rc-meta">
          <span className="tag green">{roadmap.level}</span>
          {roadmap.timeEstimate && <span className="tag">{roadmap.timeEstimate}</span>}
        </div>
      </div>

      {/* Primary conversion CTA — kept above the fold and repeated at the end. */}
      <div
        className="outcomes-banner"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
      >
        <div>
          <strong>Want this for your level?</strong>
          <div style={{ color: "var(--ink-60)", fontSize: 14, marginTop: 2 }}>
            Generate your own free, personalised {topic} roadmap in seconds.
          </div>
        </div>
        <button className="btn-dark" onClick={() => onCreateOwn(topic)}>
          Create my version →
        </button>
      </div>

      {roadmap.outcomes?.length > 0 && (
        <div className="outcomes-banner outcomes-list">
          <strong>By the end, you'll be able to</strong>
          <ul>
            {roadmap.outcomes.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {roadmap.phases.map((phase, pi) => (
        <div key={phase.id}>
          <div className="phase-label">
            <span className="phase-num">{pi + 1}</span>
            {phase.title}
          </div>
          {phase.nodes.map((node) => (
            <div key={node.id} className="rm-node" style={{ cursor: "default" }}>
              <span className="rm-node-title">{node.title}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <button className="btn-dark" onClick={() => onCreateOwn(topic)}>
          Create my own {topic} roadmap — free →
        </button>
        <div style={{ marginTop: 10 }}>
          <button className="nav-link" onClick={onExplore}>
            or explore any other topic
          </button>
        </div>
      </div>
    </div>
  );
}
