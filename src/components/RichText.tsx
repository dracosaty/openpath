import { Fragment } from "react";

// Lightweight, dependency-free inline formatter. The lesson model emits light
// Markdown to keep reading lively; we render it to React nodes (never raw
// HTML, so there's no XSS surface). Unmatched / malformed markers fall through
// as plain text, so it degrades gracefully to the old plain rendering.
//
//   **bold**      -> <strong>
//   *italic*      -> <em>
//   ==highlight== -> <mark class="lp-hl">
//   `code`        -> <code class="lp-code">   (foreign words, terms, values)
//
// Order in the alternation matters: ** before * so bold wins over italic.
const TOKEN = /(\*\*[^*]+\*\*|==[^=]+==|`[^`]+`|\*[^*\n]+\*)/g;

export default function RichText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.length > 4 && p.startsWith("**") && p.endsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.length > 4 && p.startsWith("==") && p.endsWith("=="))
          return (
            <mark className="lp-hl" key={i}>
              {p.slice(2, -2)}
            </mark>
          );
        if (p.length > 2 && p.startsWith("`") && p.endsWith("`"))
          return (
            <code className="lp-code" key={i}>
              {p.slice(1, -1)}
            </code>
          );
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*"))
          return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
