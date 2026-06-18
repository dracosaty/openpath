import { useState, useEffect } from "react";
import { PRESETS, SUGGESTIONS, type PresetCard } from "../data/presets";

interface Props {
  onStart: (topic: string) => void;
  onOpenPreset: (preset: PresetCard) => void;
}

const ANIMATED_TOPICS = [
  "Python for beginners",
  "History of the Roman Empire",
  "Machine Learning fundamentals",
  "Photography basics",
  "Learn Spanish",
  "Quantum physics",
  "Personal finance",
  "Web development",
  "Philosophy of mind",
  "Chess strategy",
];

/** Landing / Explore page: hero generator box + popular roadmaps. */
export default function Explore({ onStart, onOpenPreset }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [topicIdx, setTopicIdx] = useState(0);
  const [phVisible, setPhVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setPhVisible(false);
      setTimeout(() => {
        setTopicIdx((i) => (i + 1) % ANIMATED_TOPICS.length);
        setPhVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(id);
  }, []);

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
          <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go(value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder=""
              aria-label="What do you want to learn?"
            />
            {!value && !focused && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  pointerEvents: "none",
                  color: "var(--ink-40)",
                  fontSize: 16,
                  fontWeight: 500,
                  opacity: phVisible ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  maxWidth: "100%",
                }}
              >
                {ANIMATED_TOPICS[topicIdx]}
              </span>
            )}
          </div>
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
