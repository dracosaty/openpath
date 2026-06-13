import { useState } from "react";
import { CALIBRATION_QUESTIONS } from "../lib/calibration";
import type { LearnerProfile } from "../types";

interface Props {
  topic: string;
  onCancel: () => void;
  onDone: (profile: LearnerProfile) => void;
}

/** The 3-question calibration modal shown before a roadmap is generated. */
export default function CalibrationModal({ topic, onCancel, onDone }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = CALIBRATION_QUESTIONS.every((q) => answers[q.key]);

  return (
    <div
      className="modal-veil"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal-card">
        <div className="lp-eyebrow">Personalising your roadmap</div>
        <h2>{topic}</h2>
        <p className="modal-sub">
          Three quick questions so the roadmap matches your level — not a generic
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

        <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
          <button
            className="btn-dark"
            style={{ flex: 1 }}
            disabled={!complete}
            onClick={() => onDone(answers as unknown as LearnerProfile)}
          >
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
