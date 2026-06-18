import { useEffect, useState } from "react";
import type { Roadmap } from "../types";
import {
  shareUrl,
  shareText,
  SOCIALS,
  copyToClipboard,
  nativeShare,
} from "../lib/share";
import { makeRoadmapPublic } from "../lib/db";
import ShareCard from "./ShareCard";

interface Props {
  roadmap: Roadmap;
  roadmapDbId: string | null;
  variant?: "share" | "complete";
  onClose: () => void;
}

/** Share modal: branded card + 1-tap social targets + copy link. */
export default function ShareSheet({ roadmap, roadmapDbId, variant = "share", onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Make the roadmap public the moment the sheet opens (so the link works).
  useEffect(() => {
    if (roadmapDbId) {
      setPublishing(true);
      makeRoadmapPublic(roadmapDbId).finally(() => setPublishing(false));
    }
  }, [roadmapDbId]);

  // Without a saved id (signed-out), fall back to a topic-seeded link so the
  // CTA loop still works — the viewer just lands on the generator.
  const linkId = roadmapDbId ?? "";
  const url = linkId
    ? shareUrl(linkId)
    : `${window.location.origin}/?topic=${encodeURIComponent(roadmap.topic ?? roadmap.title)}`;
  const text = shareText(roadmap.title);

  async function onCopy() {
    if (await copyToClipboard(url)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  async function onNative() {
    await nativeShare(url, roadmap.title, text);
  }

  return (
    <div className="modal-veil" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div className="lp-eyebrow">{variant === "complete" ? "You did it 🎉" : "Share your roadmap"}</div>
        <h2 style={{ marginTop: 2 }}>
          {variant === "complete" ? "Show off what you finished" : "Spread the knowledge"}
        </h2>
        <p className="modal-sub">
          {variant === "complete"
            ? "You completed every step. Post your proof — and let others start their own."
            : "Anyone with the link can view this roadmap and spin up their own version for free."}
        </p>

        <div style={{ margin: "16px 0" }}>
          <ShareCard roadmap={roadmap} variant={variant} />
        </div>

        {/* Social targets */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="suggestion-chip" onClick={onNative}>
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

        {/* Copy link */}
        <div className="gen-box" style={{ marginTop: 14 }}>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn-dark" onClick={onCopy} disabled={publishing}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>

        {!roadmapDbId && (
          <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 10 }}>
            Sign in to share a live, viewable roadmap. This link sends friends to create their own.
          </p>
        )}

        <button className="nav-link" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
