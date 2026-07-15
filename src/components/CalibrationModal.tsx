import { useState } from "react";
import { CALIBRATION_QUESTIONS } from "../lib/calibration";
import type { LearnerProfile } from "../types";

interface Props {
  topic: string;
  initialContext?: string;
  onCancel: () => void;
  onDone: (profile: LearnerProfile) => void;
}

/** Calibration modal: 3 quick questions + optional background context. */
export default function CalibrationModal({
  topic,
  initialContext = "",
  onCancel,
  onDone,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showContext, setShowContext] = useState(!!initialContext);
  const [context, setContext] = useState(initialContext);
  const complete = CALIBRATION_QUESTIONS.every((q) => answers[q.key]);

  function done() {
    onDone({
      ...(answers as unknown as LearnerProfile),
      context: context.trim() || undefined,
    });
  }

  return (
    <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card">
        <div className="lp-eyebrow">Personalising your roadmap</div>
        <h2>{topic}</h2>
        <p className="modal-sub">
          A few quick questions so the roadmap matches your level — not a generic
          template.
        </p>

        {CALIBRATION_QUESTIONS.map((q) => (
          <div key={q.key}>
            <div className="cal-q">{q.q}</div>
            <div className="cal-opts">
              {q.opts.map((opt) => (
                <button
                  key={opt}
                  className={`cal-opt ${answers[q.key] === opt ? "sel" : ""}`}
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Optional personalization context */}
        {!showContext ? (
          <button
            className="nav-link"
            style={{ marginTop: 16, display: "inline-block" }}
            onClick={() => setShowContext(true)}
          >
            + Tailor to my background (resume, curriculum, current level)
          </button>
        ) : (
          <div style={{ marginTop: 16 }}>
            <div className="cal-q">Your background (optional)</div>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              placeholder="Paste your resume, or describe your background — e.g. 'CBSE class 10', '2nd-year CS student', 'marketing manager switching to data'. We'll skip what you know and target your gaps."
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1.5px solid var(--ink-12)",
                borderRadius: 10,
                fontFamily: "var(--font-body)",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button className="btn-dark" style={{ flex: 1 }} disabled={!complete} onClick={done}>
            Generate my roadmap →
          </button>
          <button className="btn-outline" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
