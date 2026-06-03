import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, parseUploadedFile } from "@/lib/parse";
import { handleApiError, jsonError } from "@/lib/api";

/**
 * POST /api/upload — multipart form-data with a single "file" field.
 * The file (.txt / .md / .docx) is converted into a new editable document
 * owned by the current user.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file provided. Attach a .txt, .md, or .docx file.", 400);
    }
    if (file.size === 0) {
      return jsonError("The uploaded file is empty.", 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError(`File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`, 413);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { title, content } = await parseUploadedFile(file.name, buffer);

    const doc = await prisma.document.create({
      data: { title, content, ownerId: user.id },
      select: { id: true, title: true },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
