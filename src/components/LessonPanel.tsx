import { useEffect, useMemo, useState } from "react";
import { generateLesson, generateDeeper } from "../lib/ai";
import { submitFeedback } from "../lib/db";
import { enqueueReviews } from "../lib/review";
import { authEnabled } from "../lib/supabase";
import type { Lesson, RoadmapNode, LearnerProfile, DeeperTopic, Phase } from "../types";
import Diagram from "./Diagram";
import RichText from "./RichText";

/** The model (or a stale cache entry) doesn't always return `quiz` as an
 *  array — a single-question quiz can come back as a bare object, which
 *  crashes `.map()`. The server already normalizes this, but a stale cached
 *  response predates that fix, so guard here too rather than trust the shape. */
function normalizeLesson(lesson: Lesson | null | undefined): Lesson | null {
  if (!lesson) return null;
  const raw = lesson.quiz as unknown;
  const quiz = Array.isArray(raw) ? raw : raw ? [raw as Lesson["quiz"][number]] : [];
  return { ...lesson, quiz };
}

interface Props {
  node: RoadmapNode;
  pathTitle: string;
  profile: LearnerProfile;
  isDone: boolean;
  roadmapDbId: string | null;
  phases: Phase[];
  completed: Set<string>;
  onClose: () => void;
  onComplete: () => void;
  onAddDeeper: (topics: DeeperTopic[]) => void;
  onNavigate: (node: RoadmapNode, phaseId: string) => void;
  /** Called once after a lesson is generated so the parent can cache it on
   *  the node — revisiting the node then skips regeneration entirely. */
  onLessonLoaded: (nodeId: string, lesson: Lesson) => void;
}

export default function LessonPanel({
  node,
  pathTitle,
  profile,
  isDone,
  roadmapDbId,
  phases,
  completed,
  onClose,
  onComplete,
  onAddDeeper,
  onNavigate,
  onLessonLoaded,
}: Props) {
  const [lesson, setLesson] = useState<Lesson | null>(normalizeLesson(node.lesson));
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"lesson" | "practice">("lesson");
  // Mobile: the TOC is hidden and opened as a slide-in overlay via this flag.
  const [tocOpen, setTocOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [loadingDeeper, setLoadingDeeper] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportDone, setReportDone] = useState(false);

  // Flat, ordered view of every node across every phase — lets "liberty to
  // learn how you want" work both ways: step through sequentially (Prev/
  // Next) or jump anywhere via the TOC. Recomputed from `phases` so it
  // stays correct after "Go deeper" appends nodes to a phase.
  const flat = useMemo(
    () => phases.flatMap((p) => p.nodes.map((n) => ({ node: n, phaseId: p.id }))),
    [phases],
  );
  const idx = flat.findIndex((f) => f.node.id === node.id);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < flat.length - 1;
  const goPrev = () => hasPrev && onNavigate(flat[idx - 1].node, flat[idx - 1].phaseId);
  const goNext = () => hasNext && onNavigate(flat[idx + 1].node, flat[idx + 1].phaseId);

  async function load() {
    setError(false);
    setLesson(normalizeLesson(node.lesson));
    if (node.lesson) return; // cached on the node — no regeneration
    try {
      const fresh = normalizeLesson(await generateLesson(node.title, pathTitle, profile));
      setLesson(fresh);
      if (fresh) onLessonLoaded(node.id, fresh);
    } catch {
      setError(true);
    }
  }

  useEffect(() => {
    load();
    setTab("lesson");
    setTocOpen(false);
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
        {tocOpen && <div className="lp-toc-veil" onClick={() => setTocOpen(false)} />}
        <nav className={`lp-toc ${tocOpen ? "open" : ""}`}>
          <div className="lp-toc-head">
            <span>Contents</span>
            <button className="icon-btn" onClick={() => setTocOpen(false)} aria-label="Close contents">
              ✕
            </button>
          </div>
          {phases.map((phase) => (
            <div key={phase.id} className="lp-toc-phase">
              <h4>{phase.title}</h4>
              {phase.nodes.map((n) => (
                <div
                  key={n.id}
                  className={`lp-toc-item ${n.id === node.id ? "active" : ""} ${
                    completed.has(n.id) ? "done" : ""
                  }`}
                  onClick={() => {
                    onNavigate(n, phase.id);
                    setTocOpen(false);
                  }}
                >
                  {completed.has(n.id) && n.id !== node.id ? "✓ " : ""}
                  {n.title}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="lp-main">
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
            <div className="lp-nav-row">
              <button
                className="lp-nav-btn lp-toc-toggle"
                onClick={() => setTocOpen(true)}
                aria-label="Open contents"
              >
                ☰ Contents
              </button>
              <button className="lp-nav-btn" disabled={!hasPrev} onClick={goPrev}>
                ← Prev
              </button>
              {idx >= 0 && (
                <span className="lp-nav-progress">
                  {idx + 1} / {flat.length}
                </span>
              )}
              <button className="lp-nav-btn" disabled={!hasNext} onClick={goNext}>
                Next →
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
              <div className="lp-tabs">
                <button
                  className={`lp-tab ${tab === "lesson" ? "active" : ""}`}
                  onClick={() => setTab("lesson")}
                >
                  Lesson
                </button>
                <button
                  className={`lp-tab ${tab === "practice" ? "active" : ""}`}
                  onClick={() => setTab("practice")}
                >
                  Practice
                </button>
              </div>

              {tab === "lesson" ? (
                <>
                  <p className="lesson">
                    <RichText text={lesson.lessonText} />
                  </p>

                  <h3>Worked example</h3>
                  <p className="lesson">
                    <RichText text={lesson.example} />
                  </p>

                  {lesson.diagram && <Diagram d={lesson.diagram} />}

                  <h3>Key terms</h3>
                  <ul className="key-terms">
                    {lesson.keyTerms.map((t) => (
                      <li key={t.term}>
                        <strong>{t.term}</strong> — {t.def}
                      </li>
                    ))}
                  </ul>

                  <button className="btn-dark" style={{ marginTop: 20 }} onClick={() => setTab("practice")}>
                    Practice what you learned →
                  </button>
                </>
              ) : (
                <>
                  <div className="fact-card">
                    <strong>Did you know?</strong> <RichText text={lesson.funFact} />
                  </div>

                  {lesson.quiz && lesson.quiz.length > 0 ? (
                    lesson.quiz.map((qz, qi) => (
                      <div key={qi} style={{ marginTop: 16 }}>
                        <p style={{ fontWeight: 700 }}>{qz.q}</p>
                        {(Array.isArray(qz.options) ? qz.options : []).map((opt) => {
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
                    ))
                  ) : (
                    <p className="modal-sub" style={{ marginTop: 16 }}>
                      No quiz for this lesson — you're all set.
                    </p>
                  )}
                </>
              )}

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
        </div>
      </aside>
    </div>
  );
}
