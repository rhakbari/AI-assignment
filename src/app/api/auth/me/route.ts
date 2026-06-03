import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Not authenticated", 401);
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}
