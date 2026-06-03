import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
