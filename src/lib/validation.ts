import { z } from "zod";

/** Centralised request validation. API routes parse bodies through these. */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200).optional(),
    content: z.string().max(1_000_000).optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nothing to update",
  });

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]).default("VIEWER"),
});

export const updateShareSchema = z.object({
  role: z.enum(["VIEWER", "COMMENTER", "EDITOR"]),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty").max(5000),
  quote: z.string().max(2000).optional(),
});

export const updateCommentSchema = z.object({
  resolved: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ShareInput = z.infer<typeof shareSchema>;
