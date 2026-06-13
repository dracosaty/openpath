import { useMemo, useState } from "react";
import type { Roadmap, RoadmapNode, DeeperTopic } from "../types";
import LessonPanel from "../components/LessonPanel";

interface Props {
  roadmap: Roadmap | null;
  completed: Set<string>;
  onComplete: (nodeId: string) => void;
  onBack: () => void;
  onMutate: (next: Roadmap) => void;
}

export default function RoadmapView({
  roadmap,
  completed,
  onComplete,
  onBack,
  onMutate,
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
        <h2>No roadmap yet</h2>
        <p className="modal-sub">Generate one from the Explore page to get started.</p>
        <button className="btn-outline" onClick={onBack}>
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
        <h1>{roadmap.title}</h1>
        <p className="rm-desc">{roadmap.description}</p>
        <div className="rc-meta">
          <span className="tag green">{roadmap.level}</span>
          {roadmap.timeEstimate && <span className="tag">{roadmap.timeEstimate}</span>}
        </div>
      </div>

      {roadmap.outcomes?.length > 0 && (
        <div className="outcomes-banner">
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
          onClose={() => setOpenNode(null)}
          onComplete={() => onComplete(openNode.node.id)}
          onAddDeeper={(topics) => addDeeper(openNode.phaseId, topics)}
        />
      )}
    </div>
  );
}
