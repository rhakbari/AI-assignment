import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canView } from "@/lib/access";
import { htmlToMarkdown, slugifyTitle } from "@/lib/export";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** GET /api/documents/[id]/export?format=md — download the document as Markdown. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: { select: { userId: true, role: true } } },
    });
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("You do not have access to this document", 403);

    const format = req.nextUrl.searchParams.get("format") ?? "md";
    if (format !== "md") {
      return jsonError("Unsupported export format. Use format=md.", 400);
    }

    const markdown = `# ${doc.title}\n\n${htmlToMarkdown(doc.content)}\n`;
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slugifyTitle(doc.title)}.md"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
