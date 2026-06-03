import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManage } from "@/lib/access";
import { shareSchema } from "@/lib/validation";
import { handleApiError, jsonError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

async function loadDocForManage(id: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: { select: { userId: true, role: true } } },
  });
  if (!doc) return { error: jsonError("Document not found", 404) };
  if (!canManage(doc, userId)) {
    return { error: jsonError("Only the owner can manage sharing", 403) };
  }
  return { doc };
}

/** GET /api/documents/[id]/share — list collaborators (owner only). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { error } = await loadDocForManage(id, user.id);
    if (error) return error;

    const shares = await prisma.share.findMany({
      where: { documentId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      shares.map((s) => ({ userId: s.userId, role: s.role, name: s.user.name, email: s.user.email })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/documents/[id]/share — grant or update access by email (owner only). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { error } = await loadDocForManage(id, user.id);
    if (error) return error;

    const { email, role } = shareSchema.parse(await req.json());

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) {
      return jsonError(`No user found with email "${email}". They need an account first.`, 404);
    }
    if (target.id === user.id) {
      return jsonError("You already own this document", 400);
    }

    const share = await prisma.share.upsert({
      where: { documentId_userId: { documentId: id, userId: target.id } },
      update: { role },
      create: { documentId: id, userId: target.id, role },
    });

    return NextResponse.json({
      userId: target.id,
      role: share.role,
      name: target.name,
      email: target.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/documents/[id]/share?userId=... — revoke access (owner only). */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { error } = await loadDocForManage(id, user.id);
    if (error) return error;

    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return jsonError("Missing userId", 400);

    await prisma.share.deleteMany({ where: { documentId: id, userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
