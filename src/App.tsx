import { useState } from "react";
import type { View, Roadmap, LearnerProfile } from "./types";
import { generateRoadmap } from "./lib/ai";
import { type PresetCard } from "./data/presets";
import Explore from "./views/Explore";
import RoadmapView from "./views/RoadmapView";
import ComingSoon from "./views/ComingSoon";
import CalibrationModal from "./components/CalibrationModal";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runGeneration(topic: string, profile: LearnerProfile) {
    setPendingTopic(null);
    setGenerating(true);
    setError(null);
    try {
      const rm = await generateRoadmap(topic, profile);
      setRoadmap(rm);
      setCompleted(new Set());
      setView("roadmap");
    } catch {
      setError("Something went wrong while generating. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function openPreset(p: PresetCard) {
    // Presets reuse the same calibration → generate flow for now.
    setPendingTopic(p.title);
  }

  function toggleComplete(nodeId: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  }

  const navItem = (v: View, label: string, enabled = true) => (
    <span
      className={`nav-link ${view === v ? "active" : ""}`}
      onClick={() => enabled && setView(v)}
      style={enabled ? {} : { opacity: 0.35, cursor: "default" }}
    >
      {label}
    </span>
  );

  return (
    <>
      <nav className="topnav">
        <div className="brand" onClick={() => setView("home")}>
          <span className="brand-dot" />
          OpenPath
        </div>
        {navItem("home", "Explore")}
        {navItem("roadmap", "My Roadmap", !!roadmap)}
        {navItem("exam", "Exams")}
        {navItem("vault", "Credentials")}
        <div className="nav-right">
          <span className="nav-link">Sign in</span>
        </div>
      </nav>

      {error && (
        <div className="toast" role="alert" style={{ margin: "12px auto", maxWidth: 600 }}>
          {error}
        </div>
      )}

      {generating && (
        <div className="gen-loading" style={{ textAlign: "center", padding: 40 }}>
          <p className="modal-sub">
            Designing a path for your level — usually takes a few seconds.
          </p>
        </div>
      )}

      {!generating && view === "home" && (
        <Explore onStart={setPendingTopic} onOpenPreset={openPreset} />
      )}

      {!generating && view === "roadmap" && (
        <RoadmapView
          roadmap={roadmap}
          completed={completed}
          onComplete={toggleComplete}
          onBack={() => setView("home")}
          onMutate={setRoadmap}
        />
      )}

      {view === "exam" && (
        <ComingSoon
          eyebrow="AI-proctored · Verifiable"
          title="Proctored Exams"
          blurb="Prove your skill formally with a proctored assessment. This module is descoped for v1 — see the README for the privacy and consent work it requires first."
        />
      )}

      {view === "vault" && (
        <ComingSoon
          eyebrow="Blockchain-anchored"
          title="Credential Vault"
          blurb="Tamper-proof, verifiable credentials for completed roadmaps. Descoped for v1 while we focus on the core learning loop."
        />
      )}

      {pendingTopic && (
        <CalibrationModal
          topic={pendingTopic}
          onCancel={() => setPendingTopic(null)}
          onDone={(profile) => runGeneration(pendingTopic, profile)}
        />
      )}
    </>
  );
}
