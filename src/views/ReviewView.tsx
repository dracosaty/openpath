import { useEffect, useMemo, useState } from "react";
import { getDueReviews, gradeReview, type ReviewItem } from "../lib/review";
import { intervalLabel, type Grade } from "../lib/srs";

interface Props {
  onBack: () => void;
  onChanged: () => void; // refresh nav due-count
}

/** Spaced-repetition review session: re-answer due quiz items, then grade. */
export default function ReviewView({ onBack, onChanged }: Props) {
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    getDueReviews().then(setQueue);
  }, []);

  const current = queue && idx < queue.length ? queue[idx] : null;

  // Stable shuffled options per card.
  const options = useMemo(
    () => (current ? [...current.options].sort(() => Math.random() - 0.5) : []),
    [current?.id],
  );

  if (queue === null) {
    return (
      <div className="rm-page">
        <p className="modal-sub">Loading your review…</p>
      </div>
    );
  }

  if (queue.length === 0 || idx >= queue.length) {
    return (
      <div className="rm-page" style={{ textAlign: "center", paddingTop: 40 }}>
        <div style={{ fontSize: 44 }}>{queue.length === 0 ? "🌱" : "✅"}</div>
        <h1>{queue.length === 0 ? "Nothing due right now" : "Review complete!"}</h1>
        <p className="modal-sub">
          {queue.length === 0
            ? "Answer a few lesson quizzes and they'll show up here, scheduled so you actually remember them."
            : `You reviewed ${done} ${done === 1 ? "card" : "cards"}. Spaced out so it sticks — come back tomorrow.`}
        </p>
        <button className="btn-dark" style={{ marginTop: 16 }} onClick={onBack}>
          ← Back to learning
        </button>
      </div>
    );
  }

  const correct = picked !== null && picked === current!.answer;

  async function grade(g: Grade) {
    await gradeReview(current!, g);
    setDone((d) => d + 1);
    setPicked(null);
    setIdx((i) => i + 1);
    onChanged();
  }

  return (
    <div className="rm-page" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="nav-link" onClick={onBack}>
          ← Exit review
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-60)" }}>
          {idx + 1} / {queue.length}
        </span>
      </div>

      <div className="rm-progress-card" style={{ marginTop: 12 }}>
        <div className="rm-progress-bar">
          <div className="rm-progress-fill" style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>
      </div>

      <div className="lp-eyebrow" style={{ marginTop: 24 }}>
        {current!.nodeTitle}
      </div>
      <h2 style={{ marginTop: 4 }}>{current!.question}</h2>

      <div style={{ marginTop: 16 }}>
        {options.map((opt) => {
          const cls =
            picked === null
              ? "q-opt"
              : opt === current!.answer
                ? "q-opt correct"
                : opt === picked
                  ? "q-opt wrong"
                  : "q-opt";
          return (
            <button key={opt} className={cls} onClick={() => picked === null && setPicked(opt)} disabled={picked !== null}>
              {opt}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div style={{ marginTop: 22 }}>
          <p style={{ fontWeight: 700, color: correct ? "var(--accent)" : "var(--red)" }}>
            {correct ? "Correct — how well did you know it?" : "Not quite — you'll see this again soon."}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            {!correct ? (
              <button className="btn-dark" onClick={() => grade("again")}>
                Continue ({intervalLabel("again", current!)})
              </button>
            ) : (
              <>
                <button className="btn-outline" onClick={() => grade("again")}>
                  Forgot · {intervalLabel("again", current!)}
                </button>
                <button className="btn-dark" onClick={() => grade("good")}>
                  Good · {intervalLabel("good", current!)}
                </button>
                <button className="btn-dark" onClick={() => grade("easy")}>
                  Easy · {intervalLabel("easy", current!)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
