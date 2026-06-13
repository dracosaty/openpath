import { useState } from "react";
import { PRESETS, SUGGESTIONS, type PresetCard } from "../data/presets";

interface Props {
  onStart: (topic: string) => void;
  onOpenPreset: (preset: PresetCard) => void;
}

/** Landing / Explore page: hero generator box + popular roadmaps. */
export default function Explore({ onStart, onOpenPreset }: Props) {
  const [value, setValue] = useState("");
  const go = (t: string) => t.trim() && onStart(t.trim());

  return (
    <>
      <section className="hero">
        <div className="hero-eyebrow">
          <span className="brand-dot" />
          Free, AI-guided learning for everyone
        </div>
        <h1>
          Learn <em>anything.</em>
          <br />
          One living roadmap at a time.
        </h1>
        <p className="hero-sub">
          Type any subject — school, career, or curiosity. Get a structured path
          built for <strong>your</strong> level, with lessons and practice inside
          every step.
        </p>

        <div className="gen-box">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go(value)}
            placeholder="What do you want to learn? e.g. Astrophysics, Excel, French…"
          />
          <button className="btn-dark" onClick={() => go(value)}>
            Generate
          </button>
        </div>

        <div className="gen-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="suggestion-chip" onClick={() => go(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="browse">
        <div className="browse-section-label">Popular roadmaps</div>
        <div className="roadmap-grid">
          {PRESETS.map((p) => (
            <div key={p.id} className="roadmap-card" onClick={() => onOpenPreset(p)}>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
              <div className="rc-meta">
                <span className="tag green">{p.level}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
