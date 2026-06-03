import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canComment, canView } from "@/lib/access";
import { createCommentSchema } from "@/lib/validation";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
}

/** GET /api/documents/[id]/comments — list comments (anyone with view access). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("No access", 403);

    const comments = await prisma.comment.findMany({
      where: { documentId: id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(
      comments.map((c) => ({
        id: c.id,
        body: c.body,
        quote: c.quote,
        resolved: c.resolved,
        authorId: c.authorId,
        author: c.author.name,
        createdAt: c.createdAt,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/documents/[id]/comments — add a comment (owner/editor/commenter). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canComment(doc, user.id)) {
      return jsonError("You don't have permission to comment on this document", 403);
    }

    const { body, quote } = createCommentSchema.parse(await req.json());
    const comment = await prisma.comment.create({
      data: { documentId: id, authorId: user.id, body, quote: quote || null },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(
      {
        id: comment.id,
        body: comment.body,
        quote: comment.quote,
        resolved: comment.resolved,
        authorId: comment.authorId,
        author: comment.author.name,
        createdAt: comment.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
