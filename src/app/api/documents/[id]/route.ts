import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEdit, canManage, canView, effectiveRole } from "@/lib/access";
import { updateDocumentSchema } from "@/lib/validation";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

/** GET /api/documents/[id] — full document if the user may view it. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("You do not have access to this document", 403);

    const role = effectiveRole(doc, user.id);
    const isOwner = role === "OWNER";

    return NextResponse.json({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      updatedAt: doc.updatedAt,
      role,
      owner: { id: doc.owner.id, name: doc.owner.name, email: doc.owner.email },
      // Only the owner manages sharing, so only they receive the share list.
      shares: isOwner
        ? doc.shares.map((s) => ({
            userId: s.userId,
            role: s.role,
            name: s.user.name,
            email: s.user.email,
          }))
        : [],
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/documents/[id] — rename and/or update content. Requires edit access. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canEdit(doc, user.id)) {
      return jsonError("You only have view access to this document", 403);
    }

    const { title, content } = updateDocumentSchema.parse(await req.json());
    const data: { title?: string; content?: string } = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = sanitizeDocumentHtml(content);

    const updated = await prisma.document.update({
      where: { id },
      data,
      select: { id: true, title: true, updatedAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/documents/[id] — owner only. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canManage(doc, user.id)) {
      return jsonError("Only the owner can delete this document", 403);
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
