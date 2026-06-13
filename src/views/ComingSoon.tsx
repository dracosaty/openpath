interface Props {
  eyebrow: string;
  title: string;
  blurb: string;
}

// Exams (proctoring) and Credentials (blockchain) are descoped for v1.
// They live here as clearly-labelled "coming soon" stubs. The original
// mock UIs are preserved in _prototype/ for reference. See README for the
// privacy/minor-consent notes that must be resolved before proctoring ships.
export default function ComingSoon({ eyebrow, title, blurb }: Props) {
  return (
    <div className="section-page" style={{ maxWidth: 640, margin: "60px auto", textAlign: "center" }}>
      <div className="lp-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p className="sub">{blurb}</p>
      <div className="tag" style={{ marginTop: 18 }}>
        🚧 Coming soon
      </div>
    </div>
  );
}
