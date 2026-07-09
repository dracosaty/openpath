import { useMemo, useState } from "react";
import type { Roadmap, RoadmapNode, DeeperTopic } from "../types";
import type { SavedRoadmap } from "../lib/db";
import LessonPanel from "../components/LessonPanel";

interface Props {
  roadmap: Roadmap | null;
  completed: Set<string>;
  saved: SavedRoadmap[];
  roadmapDbId: string | null;
  onResume: (s: SavedRoadmap) => void;
  onComplete: (nodeId: string) => void;
  onBack: () => void;
  onMutate: (next: Roadmap) => void;
  onShare: (variant: "share" | "complete") => void;
}

export default function RoadmapView({
  roadmap,
  completed,
  saved,
  roadmapDbId,
  onResume,
  onComplete,
  onBack,
  onMutate,
  onShare,
}: Props) {
  const [openNode, setOpenNode] = useState<{ node: RoadmapNode; phaseId: string } | null>(null);

  const total = useMemo(
    () => roadmap?.phases.reduce((n, p) => n + p.nodes.length, 0) ?? 0,
    [roadmap],
  );
  const doneCount = useMemo(
    () =>
      roadmap?.phases.reduce(
        (n, p) => n + p.nodes.filter((nd) => completed.has(nd.id)).length,
        0,
      ) ?? 0,
    [roadmap, completed],
  );
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  if (!roadmap) {
    return (
      <div className="rm-page">
        {saved.length > 0 ? (
          <>
            <h2>Your roadmaps</h2>
            <p className="modal-sub">Pick up where you left off.</p>
            <div className="roadmap-grid" style={{ marginTop: 16 }}>
              {saved.map((s) => (
                <div key={s.id} className="roadmap-card" onClick={() => onResume(s)}>
                  <h3>{s.title}</h3>
                  <p>{s.data.description}</p>
                  <div className="rc-meta">
                    <span className="tag green">{s.data.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2>No roadmap yet</h2>
            <p className="modal-sub">Generate one from the Explore page to get started.</p>
          </>
        )}
        <button className="btn-outline" style={{ marginTop: 18 }} onClick={onBack}>
          ← Explore
        </button>
      </div>
    );
  }

  function addDeeper(phaseId: string, topics: DeeperTopic[]) {
    const next: Roadmap = {
      ...roadmap!,
      phases: roadmap!.phases.map((p) =>
        p.id !== phaseId
          ? p
          : {
              ...p,
              nodes: [
                ...p.nodes,
                ...topics.map((t) => ({ id: t.id, title: t.title })),
              ],
            },
      ),
    };
    onMutate(next);
  }

  return (
    <div className="rm-page">
      <button className="nav-link" onClick={onBack}>
        ← Back to Explore
      </button>

      <div className="rm-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>{roadmap.title}</h1>
          <button className="btn-outline" onClick={() => onShare("share")}>
            ↗ Share
          </button>
        </div>
        <p className="rm-desc">{roadmap.description}</p>
        <div className="rc-meta">
          <span className="tag green">{roadmap.level}</span>
          {roadmap.timeEstimate && <span className="tag">{roadmap.timeEstimate}</span>}
        </div>
      </div>

      {pct === 100 && (
        <div
          className="outcomes-banner"
          style={{
            background: "var(--accent-soft)",
            borderColor: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>🎉 Roadmap complete!</strong>
            <div style={{ color: "var(--ink-60)", fontSize: 14, marginTop: 2 }}>
              You finished every step of {roadmap.title}. Share your proof.
            </div>
          </div>
          <button className="btn-dark" onClick={() => onShare("complete")}>
            Share my achievement →
          </button>
        </div>
      )}

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

      <div className="rm-progress-card">
        <span>Progress</span>
        <div className="rm-progress-bar">
          <div className="rm-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{pct}%</span>
      </div>

      {roadmap.phases.map((phase, pi) => (
        <div key={phase.id}>
          <div className="phase-label">
            <span className="phase-num">{pi + 1}</span>
            {phase.title}
          </div>
          {phase.nodes.map((node) => (
            <div
              key={node.id}
              className={`rm-node ${completed.has(node.id) ? "done" : ""}`}
              onClick={() => setOpenNode({ node, phaseId: phase.id })}
            >
              <span className="rm-node-title">{node.title}</span>
              {completed.has(node.id) && <span className="check">✓</span>}
            </div>
          ))}
        </div>
      ))}

      {openNode && roadmap.profile && (
        <LessonPanel
          node={openNode.node}
          pathTitle={roadmap.title}
          profile={roadmap.profile}
          isDone={completed.has(openNode.node.id)}
          roadmapDbId={roadmapDbId}
          phases={roadmap.phases}
          completed={completed}
          onClose={() => setOpenNode(null)}
          onComplete={() => onComplete(openNode.node.id)}
          onAddDeeper={(topics) => addDeeper(openNode.phaseId, topics)}
          onNavigate={(node, phaseId) => setOpenNode({ node, phaseId })}
        />
      )}
    </div>
  );
}
