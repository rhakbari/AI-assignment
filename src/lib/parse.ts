import { marked } from "marked";
import mammoth from "mammoth";
import { sanitizeDocumentHtml } from "./sanitize";

/**
 * File-import logic. A user uploads a file and we turn it into a new editable
 * document: { title, content } where content is sanitized rich-text HTML the
 * Tiptap editor understands.
 *
 * Supported types are intentionally limited (stated in the UI + README):
 *   .txt  .md / .markdown  .docx
 * Anything else is rejected with a clear error.
 */

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export class UnsupportedFileError extends Error {
  constructor(ext: string) {
    super(
      `Unsupported file type "${ext}". Supported types: ${SUPPORTED_EXTENSIONS.join(", ")}.`,
    );
    this.name = "UnsupportedFileError";
  }
}

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? filename;
  const ext = getExtension(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  return stem.trim() || "Untitled document";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain text -> paragraphs. Blank lines split paragraphs; single newlines -> <br>. */
export function txtToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("") || "<p></p>";
}

export async function markdownToHtml(text: string): Promise<string> {
  const html = await marked.parse(text, { async: true });
  return html;
}

export async function docxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}

export interface ParsedDocument {
  title: string;
  content: string; // sanitized HTML
}

/**
 * Convert an uploaded file into a document. Throws UnsupportedFileError for
 * unknown extensions. Output HTML is always sanitized before it is returned.
 */
export async function parseUploadedFile(
  filename: string,
  buffer: Buffer,
): Promise<ParsedDocument> {
  const ext = getExtension(filename);
  let rawHtml: string;

  switch (ext) {
    case ".txt":
      rawHtml = txtToHtml(buffer.toString("utf-8"));
      break;
    case ".md":
    case ".markdown":
      rawHtml = await markdownToHtml(buffer.toString("utf-8"));
      break;
    case ".docx":
      rawHtml = await docxToHtml(buffer);
      break;
    default:
      throw new UnsupportedFileError(ext || "(none)");
  }

  return {
    title: titleFromFilename(filename),
    content: sanitizeDocumentHtml(rawHtml),
  };
}
