import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { handleApiError, jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return jsonError("Invalid email or password", 401);
    }

    await createSession(user.id);
    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return handleApiError(error);
  }
}
