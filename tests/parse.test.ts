import { describe, it, expect } from "vitest";
import {
  getExtension,
  titleFromFilename,
  txtToHtml,
  markdownToHtml,
  parseUploadedFile,
  UnsupportedFileError,
} from "@/lib/parse";

describe("getExtension", () => {
  it("returns the lowercased extension", () => {
    expect(getExtension("Notes.MD")).toBe(".md");
    expect(getExtension("report.docx")).toBe(".docx");
    expect(getExtension("noext")).toBe("");
  });
});

describe("titleFromFilename", () => {
  it("strips path and extension", () => {
    expect(titleFromFilename("/tmp/My Doc.md")).toBe("My Doc");
    expect(titleFromFilename("plan.txt")).toBe("plan");
  });
  it("falls back when empty", () => {
    expect(titleFromFilename(".md")).toBe("Untitled document");
  });
});

describe("txtToHtml", () => {
  it("splits blank lines into paragraphs and escapes HTML", () => {
    const html = txtToHtml("Hello world\n\nSecond <b>para</b> & more");
    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>para"); // tag was escaped, not kept
  });
  it("turns single newlines into <br>", () => {
    expect(txtToHtml("line1\nline2")).toBe("<p>line1<br>line2</p>");
  });
});

describe("markdownToHtml", () => {
  it("converts headings, emphasis, and lists", async () => {
    const html = await markdownToHtml("# Title\n\n**bold** and *italic*\n\n- a\n- b");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<li>a</li>");
  });
});

describe("parseUploadedFile", () => {
  it("imports a .txt file into a titled, sanitized document", async () => {
    const result = await parseUploadedFile("meeting-notes.txt", Buffer.from("Agenda\n\nDiscuss roadmap"));
    expect(result.title).toBe("meeting-notes");
    expect(result.content).toContain("<p>Agenda</p>");
    expect(result.content).toContain("<p>Discuss roadmap</p>");
  });

  it("imports a .md file and preserves formatting", async () => {
    const result = await parseUploadedFile("readme.md", Buffer.from("## Section\n\n- one\n- two"));
    expect(result.title).toBe("readme");
    expect(result.content).toContain("<h2>Section</h2>");
    expect(result.content).toContain("<li>one</li>");
  });

  it("strips dangerous markup from imported content (XSS defense)", async () => {
    const malicious = "# Safe heading\n\n<script>alert('xss')</script>\n\n<img src=x onerror=alert(1)>";
    const result = await parseUploadedFile("evil.md", Buffer.from(malicious));
    expect(result.content).toContain("<h1>Safe heading</h1>");
    expect(result.content).not.toContain("<script");
    expect(result.content).not.toContain("onerror");
  });

  it("rejects unsupported file types with a clear error", async () => {
    await expect(parseUploadedFile("photo.png", Buffer.from("..."))).rejects.toBeInstanceOf(
      UnsupportedFileError,
    );
  });
});
