import { useState } from "react";
import { getApiKey, setApiKey, clearApiKey, looksValid } from "../lib/byok";

interface Props {
  onClose: () => void;
  onChange: () => void; // notify app so it can refresh "unlimited" state
}

/** Bring-your-own-key: paste an Anthropic API key for unlimited usage.
 *  Stored only in this browser; sent to our proxy per-request, never persisted. */
export default function ByokModal({ onClose, onChange }: Props) {
  const existing = getApiKey();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!looksValid(value)) {
      setError("That doesn't look like an Anthropic key (should start with sk-ant-).");
      return;
    }
    setApiKey(value);
    setSaved(true);
    setError(null);
    onChange();
    setTimeout(onClose, 700);
  }

  function remove() {
    clearApiKey();
    onChange();
    onClose();
  }

  return (
    <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="lp-eyebrow">Unlimited usage</div>
        <h2 style={{ marginTop: 2 }}>Use your own AI key</h2>
        <p className="modal-sub">
          Free accounts get a daily limit. Add your own Anthropic API key for{" "}
          <strong>unlimited</strong> roadmaps and lessons — you pay Anthropic directly
          for what you use.
        </p>

        {existing ? (
          <div
            className="outcomes-banner"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
          >
            <div>
              <strong style={{ color: "var(--accent)" }}>✓ Your key is active</strong>
              <div style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 2 }}>
                Unlimited usage enabled on this device.
              </div>
            </div>
            <button className="btn-outline" onClick={remove}>
              Remove
            </button>
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="sk-ant-…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid var(--ink-12)",
                borderRadius: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                marginTop: 6,
              }}
            />
            {error && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-dark" style={{ flex: 1 }} disabled={!value || saved} onClick={save}>
                {saved ? "Saved ✓" : "Save key"}
              </button>
              <button className="btn-outline" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "var(--ink-40)",
            lineHeight: 1.5,
            background: "var(--paper-2)",
            border: "1px solid var(--ink-12)",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          🔒 Your key is stored <strong>only in this browser</strong> and sent to our
          server solely to make your AI requests. We never save or log it. Remove it
          anytime.
          <br />
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", fontWeight: 700 }}
          >
            Get an Anthropic API key →
          </a>
        </div>

        <button className="nav-link" style={{ marginTop: 14 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
