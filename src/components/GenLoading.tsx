import { useEffect, useState } from "react";

const STEPS = [
  "Understanding your level",
  "Structuring the path",
  "Sequencing topics",
  "Finalising your roadmap",
];

/** Full-screen "building your roadmap" loader: a spinner, the topic being
 *  built, and a checklist that advances on a timer so the wait feels alive.
 *  Purely cosmetic — the real work finishes when the parent unmounts this. */
export default function GenLoading({ topic }: { topic: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    // Advance through the steps, holding on the last one until generation
    // actually completes (parent unmounts us).
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 1600);
    return () => clearInterval(id);
  }, [topic]);

  return (
    <div className="gen-loading-screen">
      <div className="gen-spinner" aria-hidden />
      <h1 className="gen-title">
        Building{topic ? " " : ""}
        {topic && <em>&ldquo;{topic}&rdquo;</em>}
      </h1>
      <p className="modal-sub">Designing a path for your level — usually takes a few seconds.</p>

      <ul className="gen-steps">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li key={label} className={`gen-step ${state}`}>
              <span className="gen-step-dot">{state === "done" ? "✓" : ""}</span>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
