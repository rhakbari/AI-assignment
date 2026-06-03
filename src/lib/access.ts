/**
 * Access-control logic, kept as pure functions with no DB/Next dependency so it
 * is trivial to unit test (see tests/access.test.ts).
 *
 * Role-based sharing model (most → least privileged):
 *   - OWNER     : the single owner. Full control + rename/delete/manage sharing.
 *   - EDITOR    : change content, rename, and comment.
 *   - COMMENTER : view + add comments, but cannot change the document.
 *   - VIEWER    : read-only.
 * Every document has exactly one owner; others are granted a share role.
 */

export type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR";
export type EffectiveRole = "OWNER" | ShareRole;

const SHARE_ROLES: ShareRole[] = ["VIEWER", "COMMENTER", "EDITOR"];

export function isShareRole(value: unknown): value is ShareRole {
  return typeof value === "string" && (SHARE_ROLES as string[]).includes(value);
}

/** Normalise a stored role string to a known ShareRole (defaults to VIEWER). */
function normalizeRole(role: string): ShareRole {
  return isShareRole(role) ? role : "VIEWER";
}

export interface ShareLike {
  userId: string;
  role: string;
}

export interface DocumentLike {
  ownerId: string;
  shares: ShareLike[];
}

/** The effective role of a user on a document, or null if they have no access. */
export function effectiveRole(doc: DocumentLike, userId: string): EffectiveRole | null {
  if (doc.ownerId === userId) return "OWNER";
  const share = doc.shares.find((s) => s.userId === userId);
  if (!share) return null;
  return normalizeRole(share.role);
}

export function canView(doc: DocumentLike, userId: string): boolean {
  return effectiveRole(doc, userId) !== null;
}

/** OWNER and EDITOR can change document content. */
export function canEdit(doc: DocumentLike, userId: string): boolean {
  const role = effectiveRole(doc, userId);
  return role === "OWNER" || role === "EDITOR";
}

/** OWNER, EDITOR, and COMMENTER can add/resolve comments. */
export function canComment(doc: DocumentLike, userId: string): boolean {
  const role = effectiveRole(doc, userId);
  return role === "OWNER" || role === "EDITOR" || role === "COMMENTER";
}

/** Rename, delete, and sharing management are owner-only. */
export function canManage(doc: DocumentLike, userId: string): boolean {
  return effectiveRole(doc, userId) === "OWNER";
}
