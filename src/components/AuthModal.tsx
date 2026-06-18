import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onClose: () => void;
}

/** Email/password sign-up + sign-in modal, plus Google OAuth (Supabase Auth).
 *
 * ACTION REQUIRED to enable Google sign-in:
 *  1. Supabase Dashboard → Authentication → Providers → Google → Enable
 *  2. Paste your Google OAuth Client ID + Secret (from console.cloud.google.com)
 *  3. Add your site URL to Supabase Auth → URL Configuration → Redirect URLs
 *
 * Email confirmation is controlled in Supabase Dashboard →
 * Authentication → Email → "Confirm email" toggle.
 */
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

  async function signInWithGoogle() {
    if (!supabase) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
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

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "11px 18px",
            border: "1.5px solid var(--ink-12)",
            borderRadius: 10,
            background: "#fff",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            transition: "border-color .15s",
            marginBottom: 4,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ink-12)")}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--ink-12)" }} />
          <span style={{ color: "var(--ink-40)", fontSize: 12, fontWeight: 700 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--ink-12)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
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
