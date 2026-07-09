import { useCallback, useEffect, useState } from "react";
import type { View, Roadmap, LearnerProfile } from "./types";
import { generateRoadmap } from "./lib/ai";
import { type PresetCard } from "./data/presets";
import { supabase, authEnabled } from "./lib/supabase";
import { useSession } from "./lib/useSession";
import {
  saveRoadmap,
  updateRoadmapData,
  listRoadmaps,
  loadProgress,
  setNodeComplete,
  getMyProfile,
  updateMyPersonalization,
  redeemReferral,
  type SavedRoadmap,
  type UserProfile,
} from "./lib/db";
import { fetchPublicRoadmap } from "./lib/public";
import Explore from "./views/Explore";
import RoadmapView from "./views/RoadmapView";
import PublicRoadmap from "./views/PublicRoadmap";
import ComingSoon from "./views/ComingSoon";
import CalibrationModal from "./components/CalibrationModal";
import AuthModal from "./components/AuthModal";
import ShareSheet from "./components/ShareSheet";
import InviteModal from "./components/InviteModal";
import ReviewView from "./views/ReviewView";
import InterviewPrepView from "./views/InterviewPrepView";
import { getReviewCounts } from "./lib/review";

const REF_KEY = "openpath_pending_ref";

export default function App() {
  const { session } = useSession();
  const [view, setView] = useState<View>("home");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [roadmapDbId, setRoadmapDbId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [pendingTopic, setPendingTopic] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [saved, setSaved] = useState<SavedRoadmap[]>([]);
  const [publicRoadmap, setPublicRoadmap] = useState<Roadmap | null>(null);
  const [share, setShare] = useState<"share" | "complete" | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  const refreshReviewCount = useCallback(() => {
    getReviewCounts().then((c) => setDueCount(c.due));
  }, []);

  // Handle shared links (?r=<id>), topic-seeded links (?topic=...), and
  // referral links (?ref=<code>) on load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("r");
    const topic = params.get("topic");
    const ref = params.get("ref");
    if (ref) localStorage.setItem(REF_KEY, ref); // redeemed after sign-in
    if (r) {
      fetchPublicRoadmap(r).then((rm) => rm && setPublicRoadmap(rm));
    } else if (topic) {
      setPendingTopic(topic);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // On sign-in: load profile and redeem any pending referral code.
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    (async () => {
      const pendingRef = localStorage.getItem(REF_KEY);
      if (pendingRef) {
        await redeemReferral(pendingRef);
        localStorage.removeItem(REF_KEY);
      }
      setProfile(await getMyProfile());
    })();
  }, [session]);

  function clearUrl() {
    window.history.replaceState(null, "", window.location.pathname);
  }

  function exitPublic() {
    setPublicRoadmap(null);
    clearUrl();
    setView("home");
  }

  const refreshSaved = useCallback(async () => {
    if (session) setSaved(await listRoadmaps());
    else setSaved([]);
  }, [session]);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  // Keep the review due-count fresh as the user signs in / navigates.
  useEffect(() => {
    refreshReviewCount();
  }, [session, view, refreshReviewCount]);

  async function runGeneration(topic: string, profile: LearnerProfile) {
    setPendingTopic(null);
    setPublicRoadmap(null);
    clearUrl();
    setGenerating(true);
    setError(null);
    try {
      const rm = await generateRoadmap(topic, profile);
      setRoadmap(rm);
      setCompleted(new Set());
      setView("roadmap");
      // Persist for signed-in users.
      const id = await saveRoadmap(rm);
      setRoadmapDbId(id);
      refreshSaved();
      // Remember personalization for next time.
      if (session && (profile.context || profile.language)) {
        updateMyPersonalization(profile.context ?? "", profile.language ?? "English");
      }
    } catch (e: any) {
      if (String(e?.message).includes("429")) {
        setError("You've hit today's free limit. Invite friends for more free generations.");
      } else {
        setError("Something went wrong while generating. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  }

  function openPreset(p: PresetCard) {
    setPendingTopic(p.title);
  }

  /** Interview prep hands off a fully-built Roadmap (the "what to learn"
   *  plan) directly into the normal roadmap/lesson pipeline — same save,
   *  same progress tracking, same lesson generation as any other roadmap. */
  async function startLearningPlan(rm: Roadmap) {
    setRoadmap(rm);
    setCompleted(new Set());
    setView("roadmap");
    const id = await saveRoadmap(rm);
    setRoadmapDbId(id);
    refreshSaved();
  }

  async function resumeRoadmap(s: SavedRoadmap) {
    setRoadmap(s.data);
    setRoadmapDbId(s.id);
    setCompleted(new Set(await loadProgress(s.id)));
    setView("roadmap");
  }

  function toggleComplete(nodeId: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      const willComplete = !next.has(nodeId);
      willComplete ? next.add(nodeId) : next.delete(nodeId);
      if (roadmapDbId) setNodeComplete(roadmapDbId, nodeId, willComplete);
      return next;
    });
  }

  function mutateRoadmap(next: Roadmap) {
    setRoadmap(next);
    if (roadmapDbId) updateRoadmapData(roadmapDbId, next);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSaved([]);
  }

  function navTo(v: View, enabled = true) {
    if (!enabled) return;
    setView(v);
    setNavOpen(false);
  }

  const navItem = (v: View, label: string, enabled = true) => (
    <span
      className={`nav-link ${view === v ? "active" : ""}`}
      onClick={() => navTo(v, enabled)}
      style={enabled ? {} : { opacity: 0.35, cursor: "default" }}
    >
      {label}
    </span>
  );

  const hasRoadmapNav = !!roadmap || saved.length > 0;

  const dueBadge = dueCount > 0 && (
    <span
      style={{
        marginLeft: 6,
        background: "var(--accent)",
        color: "#fff",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {dueCount}
    </span>
  );

  const navLinks = (
    <>
      {navItem("home", "Explore")}
      {navItem("interview", "Interview Prep")}
      {navItem("roadmap", "My Roadmap", hasRoadmapNav)}
      <span
        className={`nav-link ${view === "review" ? "active" : ""}`}
        onClick={() => navTo("review")}
      >
        Review
        {dueBadge}
      </span>
      {navItem("exam", "Exams")}
      {navItem("vault", "Credentials")}
    </>
  );

  const navActions = (
    <>
      {!authEnabled ? null : session ? (
        <>
          <span
            className="nav-link"
            onClick={() => {
              setNavOpen(false);
              setInviteOpen(true);
            }}
            title="Invite friends for more daily generations"
          >
            🎁 Invite
          </span>
          <span className="nav-link nav-email" style={{ opacity: 0.7 }}>
            {session.user.email}
          </span>
          <span
            className="nav-link"
            onClick={() => {
              setNavOpen(false);
              signOut();
            }}
          >
            Sign out
          </span>
        </>
      ) : (
        <span
          className="nav-link"
          onClick={() => {
            setNavOpen(false);
            setAuthOpen(true);
          }}
        >
          Sign in
        </span>
      )}
    </>
  );

  return (
    <>
      <nav className="topnav">
        <div className="brand" onClick={() => navTo("home")}>
          <span className="brand-dot" />
          OpenPath
        </div>
        <div className="nav-desktop">{navLinks}</div>
        <div className="nav-actions">{navActions}</div>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((o) => !o)}
        >
          <span className="bars" />
        </button>
      </nav>

      {navOpen && (
        <div className="nav-drawer open">
          {navLinks}
          {navActions}
        </div>
      )}

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

      {publicRoadmap && !generating ? (
        <PublicRoadmap
          roadmap={publicRoadmap}
          onCreateOwn={(t) => {
            setPublicRoadmap(null);
            clearUrl();
            setPendingTopic(t);
          }}
          onExplore={exitPublic}
        />
      ) : (
        <>
          {!generating && view === "home" && (
            <Explore
              onStart={setPendingTopic}
              onOpenPreset={openPreset}
              onOpenShared={(rm) => {
                setPublicRoadmap(rm);
                window.scrollTo(0, 0);
              }}
            />
          )}

          {view === "review" && (
            <ReviewView onBack={() => setView("home")} onChanged={refreshReviewCount} />
          )}

          {view === "interview" && (
            <InterviewPrepView onBack={() => setView("home")} onStartLearningPlan={startLearningPlan} />
          )}

          {!generating && view === "roadmap" && (
            <RoadmapView
              roadmap={roadmap}
              completed={completed}
              saved={saved}
              onResume={resumeRoadmap}
              onComplete={toggleComplete}
              onBack={() => setView("home")}
              onMutate={mutateRoadmap}
              onShare={(v) => setShare(v)}
              roadmapDbId={roadmapDbId}
            />
          )}
        </>
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
          initialContext={profile?.context ?? ""}
          initialLanguage={profile?.language ?? "English"}
          onCancel={() => setPendingTopic(null)}
          onDone={(p) => runGeneration(pendingTopic, p)}
        />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}

      {share && roadmap && (
        <ShareSheet
          roadmap={roadmap}
          roadmapDbId={roadmapDbId}
          variant={share}
          onClose={() => setShare(null)}
        />
      )}
    </>
  );
}
