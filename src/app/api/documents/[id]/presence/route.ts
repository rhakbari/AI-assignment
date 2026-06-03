import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canView, effectiveRole } from "@/lib/access";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

const ACTIVE_WINDOW_MS = 15_000; // a user is "here" if seen within 15s

async function loadDoc(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
}

/** POST — heartbeat. The open editor calls this every few seconds. */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("No access", 403);

    await prisma.presence.upsert({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      update: { lastSeenAt: new Date() },
      create: { documentId: id, userId: user.id, lastSeenAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET — who is currently here, plus the document's updatedAt (change indicator). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const doc = await loadDoc(id);
    if (!doc) return jsonError("Document not found", 404);
    if (!canView(doc, user.id)) return jsonError("No access", 403);

    const cutoff = new Date(Date.now() - ACTIVE_WINDOW_MS);
    const rows = await prisma.presence.findMany({
      where: { documentId: id, lastSeenAt: { gte: cutoff } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json({
      updatedAt: doc.updatedAt,
      active: rows.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        role: effectiveRole(doc, r.userId),
        isSelf: r.userId === user.id,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
