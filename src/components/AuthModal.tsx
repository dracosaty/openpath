import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onClose: () => void;
}

/** Email/password sign-up + sign-in modal (Supabase Auth). */
export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-veil"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div className="lp-eyebrow">{mode === "signup" ? "Create account" : "Welcome back"}</div>
        <h2>{mode === "signup" ? "Sign up for OpenPath" : "Sign in"}</h2>
        <p className="modal-sub">Save your roadmaps and keep your progress across sessions.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <input
            className="gen-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
          <input
            className="gen-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={fieldStyle}
          />
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{error}</p>}
        {notice && <p style={{ color: "var(--accent)", fontSize: 13, marginTop: 10 }}>{notice}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button className="btn-dark" style={{ flex: 1 }} disabled={busy || !email || !password} onClick={submit}>
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>

        <button
          className="nav-link"
          style={{ marginTop: 16 }}
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid var(--ink-12)",
  borderRadius: 10,
  fontSize: 15,
  fontFamily: "var(--font-body)",
};
