import { useMemo, useState } from "react";
import type { Roadmap, RoadmapNode, DeeperTopic } from "../types";
import type { SavedRoadmap } from "../lib/db";
import LessonPanel from "../components/LessonPanel";

/** The phase number is rendered separately (the "01" badge), so strip any
 *  redundant "Phase 1:" / "Phase 2 -" prefix the model sometimes includes. */
function cleanPhaseTitle(title: string): string {
  return title.replace(/^\s*phase\s*\d+\s*[:\-–—.)]?\s*/i, "").trim() || title;
}

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

  function addDeeper(phaseId: string, parent: RoadmapNode, topics: DeeperTopic[]) {
    // Depth drives the purple tint: 1 = light purple, 2+ = dark purple.
    const depth = (parent.depth ?? 0) + 1;
    const newNodes = topics.map((t) => ({ id: t.id, title: t.title, depth }));
    const next: Roadmap = {
      ...roadmap!,
      phases: roadmap!.phases.map((p) => {
        if (p.id !== phaseId) return p;
        // Splice the new nodes in right after their parent (rather than
        // appending at the end) so they render adjacent to it — this also
        // cascades correctly for "go deeper" on an already-deeper node.
        const parentIdx = p.nodes.findIndex((n) => n.id === parent.id);
        const insertAt = parentIdx === -1 ? p.nodes.length : parentIdx + 1;
        return {
          ...p,
          nodes: [...p.nodes.slice(0, insertAt), ...newNodes, ...p.nodes.slice(insertAt)],
        };
      }),
    };
    onMutate(next);
  }

  /** Persist a freshly generated lesson onto its node so revisiting it never
   *  regenerates — flows through onMutate into localStorage/Supabase. */
  function cacheLesson(nodeId: string, lesson: NonNullable<RoadmapNode["lesson"]>) {
    const next: Roadmap = {
      ...roadmap!,
      phases: roadmap!.phases.map((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, lesson } : n)),
      })),
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
        <div key={phase.id} className="rm-phase">
          <div className="phase-label">
            <span className="phase-num">{String(pi + 1).padStart(2, "0")}</span>
            <h2>{cleanPhaseTitle(phase.title)}</h2>
            <span className="phase-rule" />
          </div>
          <div className="rm-node-grid">
            {phase.nodes.map((node) => {
              const done = completed.has(node.id);
              const depthCls = node.depth ? `deeper-${Math.min(node.depth, 2)}` : "";
              return (
                <div
                  key={node.id}
                  className={`rm-node ${done ? "done" : ""} ${depthCls}`}
                  onClick={() => setOpenNode({ node, phaseId: phase.id })}
                >
                  <span className="rm-node-check">{done ? "✓" : ""}</span>
                  <span className="rm-node-title">{node.title}</span>
                </div>
              );
            })}
          </div>
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
          onAddDeeper={(topics) => addDeeper(openNode.phaseId, openNode.node, topics)}
          onNavigate={(node, phaseId) => setOpenNode({ node, phaseId })}
          onLessonLoaded={cacheLesson}
        />
      )}
    </div>
  );
}
