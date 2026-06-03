import TurndownService from "turndown";

/** Convert stored document HTML to Markdown for the "Export as Markdown" action. */
const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html || "");
}

/** Make a filename-safe slug from a document title. */
export function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "document"
  );
}
