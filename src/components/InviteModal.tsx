import { useEffect, useState } from "react";
import { getReferralStats, type ReferralStats } from "../lib/db";
import { copyToClipboard, SOCIALS, nativeShare } from "../lib/share";

interface Props {
  onClose: () => void;
}

const PER_REFERRAL = 10; // keep in sync with redeem_referral()

/** Invite panel: referral link + earned bonus. The engine of "refer for more". */
export default function InviteModal({ onClose }: Props) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferralStats().then(setStats);
  }, []);

  const code = stats?.code ?? "";
  const url = code ? `${window.location.origin}/?ref=${code}` : "";
  const text =
    "I'm using ZenWise to learn anything with free AI roadmaps. Join with my link and we both get more daily generations:";

  async function onCopy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="lp-eyebrow">Refer for more</div>
        <h2 style={{ marginTop: 2 }}>Invite friends, learn more</h2>
        <p className="modal-sub">
          You and your friend each get <strong>+{PER_REFERRAL} daily generations</strong>{" "}
          when they join with your link. No cap on how many you invite.
        </p>

        <div
          className="outcomes-banner"
          style={{ display: "flex", justifyContent: "space-around", textAlign: "center", margin: "16px 0" }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600 }}>
              {stats?.count ?? "—"}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 700 }}>friends joined</div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: "var(--accent)" }}>
              +{stats?.bonus ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 700 }}>daily bonus</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="suggestion-chip" onClick={() => nativeShare(url, "ZenWise", text)}>
            Share…
          </button>
          {SOCIALS.map((s) => (
            <a
              key={s.name}
              className="suggestion-chip"
              href={s.href(url, text)}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              {s.name}
            </a>
          ))}
        </div>

        <div className="gen-box" style={{ marginTop: 14 }}>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn-dark" onClick={onCopy}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>

        <button className="nav-link" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
