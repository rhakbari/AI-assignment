import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEdit } from "@/lib/access";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string; versionId: string }> };

/**
 * POST /api/documents/[id]/versions/[versionId]/restore
 * Restore a previous version. The current content is snapshotted first so the
 * restore itself is reversible. Requires edit access.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id, versionId } = await params;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { shares: { select: { userId: true, role: true } } },
    });
    if (!doc) return jsonError("Document not found", 404);
    if (!canEdit(doc, user.id)) return jsonError("You only have view access", 403);

    const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version || version.documentId !== id) {
      return jsonError("Version not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // snapshot current state before overwriting
      await tx.documentVersion.create({
        data: { documentId: id, authorId: user.id, title: doc.title, content: doc.content },
      });
      return tx.document.update({
        where: { id },
        data: { title: version.title, content: version.content },
        select: { id: true, title: true, content: true, updatedAt: true },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
