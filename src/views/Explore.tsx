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

const STEPS = [
  {
    n: 1,
    title: "Type any topic",
    body: "School subject, career skill, or pure curiosity — if you can name it, ZenWise can teach it.",
  },
  {
    n: 2,
    title: "Answer 3 quick questions",
    body: "We calibrate to your level, goal, and pace — and even your résumé — so the path is built for you, not the average.",
  },
  {
    n: 3,
    title: "Learn, practice, remember",
    body: "Work through bite-size lessons with diagrams and quizzes. Spaced repetition brings it back so it actually sticks.",
  },
];

const FEATURES = [
  { ic: "🗺️", title: "Personalised roadmaps", body: "A structured path from foundations to mastery, adapted to your level." },
  { ic: "✏️", title: "Lessons, diagrams & quizzes", body: "Clear explanations, worked examples, and a quick check inside every step." },
  { ic: "🧠", title: "Spaced repetition", body: "Quiz items resurface on a schedule so knowledge actually sticks." },
];

/** Landing / Explore page: hero generator + how-it-works + features + presets. */
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
      {/* ---------- HERO ---------- */}
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

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="section" id="how">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">From zero to a real plan in 30 seconds</h2>
        <p className="section-sub">
          No sign-up to start. No generic templates. A path that actually fits you.
        </p>
        <div className="steps">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <div className="step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FEATURES ---------- */}
      <section className="section" id="features" style={{ paddingTop: 0 }}>
        <div className="section-eyebrow">Why ZenWise</div>
        <h2 className="section-title">Everything you need to actually learn it</h2>
        <p className="section-sub">
          Most tools dump information on you. ZenWise structures it, adapts it, and
          helps you remember it.
        </p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="ic">{f.ic}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- POPULAR (presets) ---------- */}
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

      {/* ---------- CTA BAND ---------- */}
      <div className="cta-band">
        <h2>Ready to learn something today?</h2>
        <p>Pick a topic and get a personalised roadmap in seconds — completely free.</p>
        <button
          className="btn-dark"
          style={{ background: "var(--paper)", color: "var(--ink)", padding: "12px 26px" }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Start learning →
        </button>
      </div>

      {/* ---------- FOOTER ---------- */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand">
              <span className="brand-dot" />
              ZenWise
            </div>
            <p>
              Free, AI-guided learning for everyone — from class 6 to PhD. Built to
              make a personal tutor affordable for the world.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <a onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>How it works</a>
            <a onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>Features</a>
          </div>
          <div className="footer-col">
            <h4>Learn</h4>
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <a key={s} onClick={() => go(s)}>
                {s}
              </a>
            ))}
          </div>
          <div className="footer-col">
            <h4>Open source</h4>
            <a href="https://github.com/dracosaty/openpath" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a>MIT License</a>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} ZenWise · Made for curious minds everywhere
        </div>
      </footer>
    </>
  );
}
