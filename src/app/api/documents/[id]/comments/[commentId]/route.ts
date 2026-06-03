import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canComment, canManage } from "@/lib/access";
import { updateCommentSchema } from "@/lib/validation";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string; commentId: string }> };

async function load(id: string, commentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  return { doc, comment };
}

/** PATCH — resolve / re-open a comment (anyone who can comment). */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;
    const { doc, comment } = await load(id, commentId);
    if (!doc || !comment || comment.documentId !== id) return jsonError("Comment not found", 404);
    if (!canComment(doc, user.id)) return jsonError("No permission", 403);

    const { resolved } = updateCommentSchema.parse(await req.json());
    const updated = await prisma.comment.update({ where: { id: commentId }, data: { resolved } });
    return NextResponse.json({ id: updated.id, resolved: updated.resolved });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE — remove a comment. The author or the document owner may delete. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id, commentId } = await params;
    const { doc, comment } = await load(id, commentId);
    if (!doc || !comment || comment.documentId !== id) return jsonError("Comment not found", 404);
    if (comment.authorId !== user.id && !canManage(doc, user.id)) {
      return jsonError("Only the comment author or document owner can delete this", 403);
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
