import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createDocumentSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api";

/** GET /api/documents — documents owned by, or shared with, the current user. */
export async function GET() {
  try {
    const user = await requireUser();

    const docs = await prisma.document.findMany({
      where: {
        OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        shares: { where: { userId: user.id }, select: { role: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items = docs.map((d) => {
      const isOwner = d.ownerId === user.id;
      return {
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
        isOwner,
        role: isOwner ? "OWNER" : (d.shares[0]?.role ?? "VIEWER"),
        owner: { name: d.owner.name, email: d.owner.email },
      };
    });

    return NextResponse.json({
      owned: items.filter((i) => i.isOwner),
      shared: items.filter((i) => !i.isOwner),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/documents — create a new blank document owned by the current user. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = req.body ? await req.json().catch(() => ({})) : {};
    const { title } = createDocumentSchema.parse(body);

    const doc = await prisma.document.create({
      data: {
        title: title ?? "Untitled document",
        content: "<h1></h1><p></p>",
        ownerId: user.id,
      },
      select: { id: true, title: true },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
