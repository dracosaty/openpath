import { useEffect, useState } from "react";
import { generateLesson, generateDeeper } from "../lib/ai";
import type { Lesson, RoadmapNode, LearnerProfile, DeeperTopic } from "../types";
import Diagram from "./Diagram";

interface Props {
  node: RoadmapNode;
  pathTitle: string;
  profile: LearnerProfile;
  isDone: boolean;
  onClose: () => void;
  onComplete: () => void;
  onAddDeeper: (topics: DeeperTopic[]) => void;
}

export default function LessonPanel({
  node,
  pathTitle,
  profile,
  isDone,
  onClose,
  onComplete,
  onAddDeeper,
}: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(node.lesson ?? null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [loadingDeeper, setLoadingDeeper] = useState(false);

  async function load() {
    setError(false);
    setLesson(node.lesson ?? null);
    if (node.lesson) return;
    try {
      setLesson(await generateLesson(node.title, pathTitle, profile));
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
    setPicked(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  async function goDeeper() {
    setLoadingDeeper(true);
    try {
      onAddDeeper(await generateDeeper(node.title, pathTitle, profile));
    } finally {
      setLoadingDeeper(false);
    }
  }

  return (
    <div
      className="panel-veil"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="lesson-panel">
        <div className="lp-head">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="lp-eyebrow">{pathTitle}</div>
              <h2>{node.title}</h2>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="lp-body">
          {!lesson && !error && <p className="modal-sub">Generating lesson…</p>}

          {error && (
            <div>
              <p className="modal-sub">Couldn't generate the lesson. Check your connection.</p>
              <button className="btn-outline" onClick={load}>
                Retry
              </button>
            </div>
          )}

          {lesson && (
            <>
              <p>{lesson.lessonText}</p>

              <h3>Worked example</h3>
              <p>{lesson.example}</p>

              {lesson.diagram && <Diagram d={lesson.diagram} />}

              <h3>Key terms</h3>
              <ul>
                {lesson.keyTerms.map((t) => (
                  <li key={t.term}>
                    <strong>{t.term}</strong> — {t.def}
                  </li>
                ))}
              </ul>

              <div className="fact-card">
                <strong>Did you know?</strong> {lesson.funFact}
              </div>

              {lesson.quiz?.map((qz, qi) => (
                <div key={qi} style={{ marginTop: 16 }}>
                  <p style={{ fontWeight: 700 }}>{qz.q}</p>
                  {qz.options.map((opt) => {
                    const isPicked = picked === opt;
                    const cls = isPicked
                      ? opt === qz.answer
                        ? "q-opt correct"
                        : "q-opt wrong"
                      : "q-opt";
                    return (
                      <button
                        key={opt}
                        className={cls}
                        onClick={() => setPicked(opt)}
                        disabled={picked !== null}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
                <button className="btn-dark" disabled={isDone} onClick={onComplete}>
                  {isDone ? "✓ Completed" : "Mark complete"}
                </button>
                <button className="btn-outline" onClick={goDeeper} disabled={loadingDeeper}>
                  {loadingDeeper ? "Finding…" : "Go deeper →"}
                </button>
                {/* Feedback hook lands in Step 5 (writes to node_feedback). */}
                <button
                  className="nav-link"
                  title="Report an inaccuracy (wired to DB in a later step)"
                  onClick={() => alert("Thanks — issue reporting saves to the DB in a later build step.")}
                >
                  ⚑ Report issue
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
