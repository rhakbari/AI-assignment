import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";
import { UnsupportedFileError } from "./parse";

/** Consistent JSON error shape: { error: string, details?: unknown }. */
export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * Map thrown errors to HTTP responses so every route can simply
 * `try { ... } catch (e) { return handleApiError(e); }`.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return jsonError("Authentication required", 401);
  }
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 400, error.flatten());
  }
  if (error instanceof UnsupportedFileError) {
    return jsonError(error.message, 415);
  }
  console.error("Unhandled API error:", error);
  return jsonError("Internal server error", 500);
}
