import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canEdit, canView } from "@/lib/access";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
}

/** GET /api/documents/[id]/versions — list saved versions (viewers and up). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("No access", 403);

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      versions.map((v) => ({
        id: v.id,
        title: v.title,
        author: v.author.name,
        createdAt: v.createdAt,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/documents/[id]/versions — snapshot the current content (editors and up). */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canEdit(doc, user.id)) return jsonError("You only have view access", 403);

    const version = await prisma.documentVersion.create({
      data: { documentId: id, authorId: user.id, title: doc.title, content: doc.content },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
