import { useState } from "react";
import type { InterviewPrep, InterviewQuestion, Roadmap } from "../types";
import { generateInterviewPrep, generateTopicInterviewPrep } from "../lib/ai";
import { buildInterviewRoadmap } from "../lib/interviewRoadmap";
import { INTERVIEW_TOPICS, type InterviewTopic } from "../data/interviewTopics";

interface Props {
  onBack: () => void;
  onStartLearningPlan: (roadmap: Roadmap) => void;
}

const CATEGORIES: InterviewQuestion["category"][] = [
  "Behavioral",
  "Technical",
  "Role-specific",
  "Questions to ask them",
];

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid var(--ink-12)",
  borderRadius: 10,
  fontSize: 14.5,
  fontFamily: "var(--font-body)",
  resize: "vertical",
};

const STEP_LABELS = ["Your resume", "The job description", "A few extra details"];

/** Beginner-friendly, step-by-step: paste a resume, then a job description,
 *  then optional notes — and get a plan of exactly what to learn to close the
 *  gaps, plus a few sharp practice questions. Nothing here is stored server-side. */
export default function InterviewPrepView({ onBack, onStartLearningPlan }: Props) {
  const [step, setStep] = useState(1);
  const [showTopics, setShowTopics] = useState(false);
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [practiceIdx, setPracticeIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [personalized, setPersonalized] = useState(true);
  const [activeTopic, setActiveTopic] = useState<InterviewTopic | null>(null);
  const [topicBusy, setTopicBusy] = useState<string | null>(null);

  const stepValid = [resume.trim().length > 20, jobDescription.trim().length > 20, true];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await generateInterviewPrep(
        resume.trim(),
        jobDescription.trim(),
        targetRole.trim(),
        additionalContext.trim(),
      );
      setPersonalized(true);
      setActiveTopic(null);
      setPrep(r);
    } catch (e: any) {
      if (String(e?.message).includes("429")) {
        setError("You've hit today's free limit. Try again tomorrow.");
      } else {
        setError("Something went wrong while analyzing. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function exploreTopic(topic: InterviewTopic) {
    setTopicBusy(topic.id);
    setError(null);
    try {
      const r = await generateTopicInterviewPrep(topic.title);
      setPersonalized(false);
      setActiveTopic(topic);
      setTargetRole(topic.title);
      setPrep(r);
    } catch (e: any) {
      if (String(e?.message).includes("429")) {
        setError("You've hit today's free limit. Try again tomorrow.");
      } else {
        setError("Something went wrong while loading this topic. Please try again.");
      }
    } finally {
      setTopicBusy(null);
    }
  }

  function reset() {
    setPrep(null);
    setError(null);
    setPracticeIdx(null);
    setActiveTopic(null);
    setStep(1);
    setShowTopics(false);
  }

  function startLearning() {
    if (!prep) return;
    onStartLearningPlan(buildInterviewRoadmap(prep, targetRole, additionalContext));
  }

  // ---------- Practice mode: flip through questions one at a time ----------
  if (prep && practiceIdx !== null) {
    const q = prep.questions[practiceIdx];
    return (
      <div className="rm-page" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="nav-link" onClick={() => setPracticeIdx(null)}>
            ← Back to plan
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-60)" }}>
            {practiceIdx + 1} / {prep.questions.length}
          </span>
        </div>

        <div className="lp-eyebrow" style={{ marginTop: 24 }}>
          {q.category}
        </div>
        <h2 style={{ marginTop: 4 }}>{q.q}</h2>

        {!revealed ? (
          <button className="btn-dark" style={{ marginTop: 20 }} onClick={() => setRevealed(true)}>
            Reveal coaching tip
          </button>
        ) : (
          <div className="glass" style={{ borderRadius: 14, padding: 16, marginTop: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>What this is testing</p>
            <p style={{ fontSize: 14, color: "var(--ink-60)", lineHeight: 1.5 }}>{q.tip}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button
            className="btn-outline"
            disabled={practiceIdx === 0}
            onClick={() => {
              setPracticeIdx((i) => (i ?? 0) - 1);
              setRevealed(false);
            }}
          >
            ← Previous
          </button>
          <button
            className="btn-dark"
            onClick={() => {
              if (practiceIdx + 1 >= prep.questions.length) {
                setPracticeIdx(null);
              } else {
                setPracticeIdx((i) => (i ?? 0) + 1);
              }
              setRevealed(false);
            }}
          >
            {practiceIdx + 1 >= prep.questions.length ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Report ----------
  if (prep) {
    return (
      <div className="rm-page" style={{ maxWidth: 780 }}>
        <button className="nav-link" onClick={onBack}>
          ← Exit
        </button>

        <div className="lp-eyebrow" style={{ marginTop: 20 }}>
          {personalized ? "Your prep plan" : "Interview topic briefing"}
        </div>
        <h1 style={{ marginTop: 4 }}>
          {personalized ? targetRole || "Your tailored prep" : activeTopic?.title}
        </h1>
        <p className="modal-sub">{prep.summary}</p>

        {personalized && (
          <div className="rm-progress-card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Resume ↔ JD match</span>
              <span style={{ fontWeight: 800, fontSize: 13, color: "var(--accent)" }}>
                {prep.matchScore}%
              </span>
            </div>
            <div className="rm-progress-bar">
              <div className="rm-progress-fill" style={{ width: `${prep.matchScore}%` }} />
            </div>
          </div>
        )}

        {/* ---- Primary CTA: the learning plan ---- */}
        <div
          className="glass"
          style={{ borderRadius: 16, padding: 22, marginTop: 22, border: "1.5px solid var(--accent)" }}
        >
          <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
            📚 What you need to learn
          </p>
          <p style={{ fontSize: 13.5, color: "var(--ink-60)", marginBottom: 14 }}>
            A focused study plan built from the actual gaps above — click into any topic for a real
            lesson, worked example, and quiz, exactly like any OpenPath roadmap.
          </p>
          {prep.learningPlan.map((area, ai) => (
            <div key={ai} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                {ai + 1}. {area.title}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {area.nodes.map((n, ni) => (
                  <span
                    key={ni}
                    className="tag"
                    style={{ background: "var(--paper)", border: "1px solid var(--ink-12)" }}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-dark" style={{ marginTop: 10 }} onClick={startLearning}>
            Start learning this plan →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 20 }}>
          <div className="glass" style={{ borderRadius: 14, padding: 18 }}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
              {personalized ? "✅ Strengths to lead with" : "✅ What interviewers look for"}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.7 }}>
              {prep.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="glass" style={{ borderRadius: 14, padding: 18 }}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
              {personalized ? "⚠️ Gaps to address" : "⚠️ Common mistakes"}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.7 }}>
              {prep.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {prep.talkingPoints.length > 0 && (
          <div className="glass" style={{ borderRadius: 14, padding: 18, marginTop: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
              {personalized ? "💬 Talking points for this role" : "💬 How to structure strong answers"}
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, color: "var(--ink-60)", lineHeight: 1.7 }}>
              {prep.talkingPoints.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {!personalized && (
          <div
            className="glass"
            style={{ borderRadius: 12, padding: "12px 16px", marginTop: 14, fontSize: 13, color: "var(--ink-60)" }}
          >
            💡 This is a general briefing for {activeTopic?.title}. Paste your own resume + a specific
            job description for a plan tailored to you.
          </div>
        )}

        {/* ---- Secondary: quick practice questions ---- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Quick practice questions</h2>
          <button
            className="btn-outline"
            onClick={() => {
              setPracticeIdx(0);
              setRevealed(false);
            }}
          >
            Practice →
          </button>
        </div>

        {CATEGORIES.map((cat) => {
          const qs = prep.questions.filter((q) => q.category === cat);
          if (qs.length === 0) return null;
          return (
            <div key={cat} style={{ marginTop: 14 }}>
              <span className="tag green">{cat}</span>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {qs.map((q) => (
                  <details key={q.id} className="glass" style={{ borderRadius: 12, padding: "10px 14px" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5 }}>{q.q}</summary>
                    <p style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 8, lineHeight: 1.5 }}>
                      <strong>Tip:</strong> {q.tip}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          );
        })}

        <button className="btn-outline" style={{ marginTop: 28 }} onClick={reset}>
          Start over
        </button>
      </div>
    );
  }

  // ---------- Topics browser (alternate entry, no resume needed) ----------
  if (showTopics) {
    return (
      <div className="rm-page" style={{ maxWidth: 640 }}>
        <button className="nav-link" onClick={() => setShowTopics(false)}>
          ← Back
        </button>
        <div className="lp-eyebrow" style={{ marginTop: 20 }}>
          Explore without a resume
        </div>
        <h1 style={{ marginTop: 4 }}>Browse common interview topics</h1>
        <p className="modal-sub">
          Pick a domain to see a general prep briefing and study plan — no resume needed.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {INTERVIEW_TOPICS.map((t) => (
            <button
              key={t.id}
              className="glass"
              disabled={topicBusy !== null}
              onClick={() => exploreTopic(t)}
              style={{
                textAlign: "left",
                borderRadius: 12,
                padding: "14px 16px",
                cursor: topicBusy ? "default" : "pointer",
                fontFamily: "var(--font-body)",
                opacity: topicBusy && topicBusy !== t.id ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {topicBusy === t.id ? "Loading…" : t.title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 3, lineHeight: 1.4 }}>
                {t.blurb}
              </div>
            </button>
          ))}
        </div>
        {error && (
          <div className="toast" role="alert" style={{ position: "static", marginTop: 16, display: "inline-block" }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ---------- Step-by-step wizard ----------
  return (
    <div className="rm-page" style={{ maxWidth: 640 }}>
      <button className="nav-link" onClick={onBack}>
        ← Back
      </button>

      <div className="lp-eyebrow" style={{ marginTop: 20 }}>
        Interview prep
      </div>
      <h1 style={{ marginTop: 4 }}>What do you need to learn to crack this interview?</h1>
      <p className="modal-sub">
        Three quick steps. We'll compare your resume against the job description and build a study
        plan for exactly what's missing.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                  background: state === "todo" ? "var(--paper-2)" : "var(--ink)",
                  color: state === "todo" ? "var(--ink-40)" : "var(--paper)",
                }}
              >
                {state === "done" ? "✓" : n}
              </span>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: state === "current" ? 800 : 600,
                  color: state === "todo" ? "var(--ink-40)" : "var(--ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <span style={{ flex: 1, height: 1, background: "var(--ink-12)" }} />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div>
          <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 6 }}>
            Paste your resume
          </label>
          <p style={{ fontSize: 12.5, color: "var(--ink-60)", marginBottom: 8 }}>
            Don't worry about formatting — plain text is fine. We only use this to find your gaps;
            it's never stored.
          </p>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume text here…"
            rows={10}
            autoFocus
            style={fieldStyle}
          />
          <button
            className="nav-link"
            style={{ marginTop: 10, display: "inline-block" }}
            onClick={() => setShowTopics(true)}
          >
            Don't have a specific job yet? Browse common topics instead →
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 6 }}>
            Paste the job description
          </label>
          <p style={{ fontSize: 12.5, color: "var(--ink-60)", marginBottom: 8 }}>
            The more specific, the better your study plan will be.
          </p>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here…"
            rows={10}
            autoFocus
            style={fieldStyle}
          />
        </div>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 6 }}>
              Target role (optional)
            </label>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer at Acme"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 6 }}>
              Anything else worth knowing? (optional)
            </label>
            <p style={{ fontSize: 12.5, color: "var(--ink-60)", marginBottom: 8 }}>
              e.g. "I'm switching from frontend to backend" or "This is a second interview, first
              round covered the basics."
            </p>
            <textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Optional notes…"
              rows={4}
              style={fieldStyle}
            />
          </div>
          <div
            className="glass"
            style={{ borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--ink-60)" }}
          >
            🔒 Nothing you paste here is stored — it's used only to generate this plan, then discarded.
          </div>
        </div>
      )}

      {error && (
        <div className="toast" role="alert" style={{ position: "static", marginTop: 16, display: "inline-block" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        {step > 1 && (
          <button className="btn-outline" onClick={() => setStep((s) => s - 1)} disabled={busy}>
            ← Back
          </button>
        )}
        {step < 3 ? (
          <button
            className="btn-dark"
            disabled={!stepValid[step - 1]}
            onClick={() => setStep((s) => s + 1)}
          >
            Next →
          </button>
        ) : (
          <button className="btn-dark" disabled={busy} onClick={submit}>
            {busy ? "Building your plan…" : "Build my plan →"}
          </button>
        )}
      </div>
    </div>
  );
}
