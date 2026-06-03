import sanitizeHtml from "sanitize-html";

/**
 * Document content is rich-text HTML and is rendered with dangerouslySetInnerHTML
 * in a couple of places (export, version preview). Everything that comes from a
 * user or an uploaded file is run through this allow-list before it is stored,
 * so a malicious .docx or pasted markup cannot inject scripts/handlers.
 *
 * The allow-list intentionally matches what the Tiptap editor can produce:
 * headings, basic marks, lists, links, alignment.
 */
export function sanitizeDocumentHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "hr",
      "h1", "h2", "h3", "h4",
      "strong", "b", "em", "i", "u", "s", "strike",
      "ul", "ol", "li",
      "blockquote", "code", "pre",
      "a", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["style"],
      p: ["style"],
      h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    // force safe link behaviour
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
