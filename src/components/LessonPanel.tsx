import { useEffect, useState } from "react";
import { generateLesson, generateDeeper } from "../lib/ai";
import { submitFeedback } from "../lib/db";
import { enqueueReviews } from "../lib/review";
import { authEnabled } from "../lib/supabase";
import type { Lesson, RoadmapNode, LearnerProfile, DeeperTopic } from "../types";
import Diagram from "./Diagram";

interface Props {
  node: RoadmapNode;
  pathTitle: string;
  profile: LearnerProfile;
  isDone: boolean;
  roadmapDbId: string | null;
  onClose: () => void;
  onComplete: () => void;
  onAddDeeper: (topics: DeeperTopic[]) => void;
}

export default function LessonPanel({
  node,
  pathTitle,
  profile,
  isDone,
  roadmapDbId,
  onClose,
  onComplete,
  onAddDeeper,
}: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(node.lesson ?? null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [loadingDeeper, setLoadingDeeper] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportDone, setReportDone] = useState(false);

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
    setReporting(false);
    setReason("");
    setReportDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  async function sendReport() {
    const ok = await submitFeedback({ roadmapId: roadmapDbId, node, pathTitle, reason });
    setReporting(false);
    setReason("");
    setReportDone(ok);
    if (!ok) alert("Sign in to report issues — your feedback is saved to your account.");
  }

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
                        onClick={() => {
                          setPicked(opt);
                          // Capture quiz items into spaced-repetition review.
                          if (lesson?.quiz?.length) {
                            enqueueReviews(
                              lesson.quiz.map((q) => ({
                                roadmapId: roadmapDbId,
                                nodeId: node.id,
                                nodeTitle: node.title,
                                question: q.q,
                                options: q.options,
                                answer: q.answer,
                              })),
                            );
                          }
                        }}
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
                {/* Feedback hook → writes to node_feedback (RLS: own rows). */}
                {reportDone ? (
                  <span className="nav-link" style={{ color: "var(--accent)" }}>
                    ✓ Thanks — reported
                  </span>
                ) : (
                  <button
                    className="nav-link"
                    title={authEnabled ? "Report an inaccuracy" : "Sign in to report issues"}
                    onClick={() => setReporting((r) => !r)}
                  >
                    ⚑ Report issue
                  </button>
                )}
              </div>

              {reporting && (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    placeholder="What's wrong or inaccurate about this lesson?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1.5px solid var(--ink-12)",
                      borderRadius: 10,
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="btn-dark" disabled={!reason.trim()} onClick={sendReport}>
                      Submit report
                    </button>
                    <button className="btn-outline" onClick={() => setReporting(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
