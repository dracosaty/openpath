import { Fragment } from "react";

// Lightweight, dependency-free inline formatter. The lesson model emits light
// Markdown to keep reading lively; we render it to React nodes (never raw
// HTML, so there's no XSS surface). Unmatched / malformed markers fall through
// as plain text, so it degrades gracefully to the old plain rendering.
//
//   **bold**      -> <strong>
//   *italic*      -> <em>       (also _italic_, guarded so snake_case
//                                identifiers are never mangled)
//   ==highlight== -> <mark class="lp-hl">
//   `code`        -> <code class="lp-code">   (foreign words, terms, values)
//
// Order in the alternation matters: ** before * so bold wins over italic.
// The _italic_ branch requires a non-word char on both outsides, so
// `foo_bar_baz` (word chars adjacent to the underscores) stays untouched.
const TOKEN = /(\*\*[^*]+\*\*|==[^=]+==|`[^`]+`|\*[^*\n]+\*|(?<![\w])_[^_\n]+_(?![\w]))/g;

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
        if (p.length > 2 && p.startsWith("_") && p.endsWith("_"))
          return <em key={i}>{p.slice(1, -1)}</em>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
