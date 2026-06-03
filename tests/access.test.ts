import { describe, it, expect } from "vitest";
import {
  effectiveRole,
  canView,
  canEdit,
  canComment,
  canManage,
  isShareRole,
  type DocumentLike,
} from "@/lib/access";

const OWNER = "user-owner";
const EDITOR = "user-editor";
const COMMENTER = "user-commenter";
const VIEWER = "user-viewer";
const STRANGER = "user-stranger";

const doc: DocumentLike = {
  ownerId: OWNER,
  shares: [
    { userId: EDITOR, role: "EDITOR" },
    { userId: COMMENTER, role: "COMMENTER" },
    { userId: VIEWER, role: "VIEWER" },
  ],
};

describe("effectiveRole", () => {
  it("returns OWNER for the owner", () => {
    expect(effectiveRole(doc, OWNER)).toBe("OWNER");
  });
  it("returns the share role for collaborators", () => {
    expect(effectiveRole(doc, EDITOR)).toBe("EDITOR");
    expect(effectiveRole(doc, COMMENTER)).toBe("COMMENTER");
    expect(effectiveRole(doc, VIEWER)).toBe("VIEWER");
  });
  it("returns null for users with no access", () => {
    expect(effectiveRole(doc, STRANGER)).toBeNull();
  });
  it("defaults unknown stored roles to VIEWER", () => {
    const weird: DocumentLike = { ownerId: OWNER, shares: [{ userId: VIEWER, role: "BOGUS" }] };
    expect(effectiveRole(weird, VIEWER)).toBe("VIEWER");
  });
});

describe("canView", () => {
  it("allows every role with a share + owner", () => {
    expect(canView(doc, OWNER)).toBe(true);
    expect(canView(doc, EDITOR)).toBe(true);
    expect(canView(doc, COMMENTER)).toBe(true);
    expect(canView(doc, VIEWER)).toBe(true);
  });
  it("denies strangers", () => {
    expect(canView(doc, STRANGER)).toBe(false);
  });
});

describe("canEdit", () => {
  it("allows owner and editor only", () => {
    expect(canEdit(doc, OWNER)).toBe(true);
    expect(canEdit(doc, EDITOR)).toBe(true);
  });
  it("denies commenter, viewer, and stranger", () => {
    expect(canEdit(doc, COMMENTER)).toBe(false);
    expect(canEdit(doc, VIEWER)).toBe(false);
    expect(canEdit(doc, STRANGER)).toBe(false);
  });
});

describe("canComment", () => {
  it("allows owner, editor, and commenter", () => {
    expect(canComment(doc, OWNER)).toBe(true);
    expect(canComment(doc, EDITOR)).toBe(true);
    expect(canComment(doc, COMMENTER)).toBe(true);
  });
  it("denies viewer and stranger", () => {
    expect(canComment(doc, VIEWER)).toBe(false);
    expect(canComment(doc, STRANGER)).toBe(false);
  });
});

describe("canManage (rename/delete/share)", () => {
  it("is owner-only", () => {
    expect(canManage(doc, OWNER)).toBe(true);
    expect(canManage(doc, EDITOR)).toBe(false);
    expect(canManage(doc, COMMENTER)).toBe(false);
    expect(canManage(doc, VIEWER)).toBe(false);
    expect(canManage(doc, STRANGER)).toBe(false);
  });
});

describe("isShareRole", () => {
  it("accepts VIEWER/COMMENTER/EDITOR only", () => {
    expect(isShareRole("VIEWER")).toBe(true);
    expect(isShareRole("COMMENTER")).toBe(true);
    expect(isShareRole("EDITOR")).toBe(true);
    expect(isShareRole("OWNER")).toBe(false);
    expect(isShareRole("")).toBe(false);
    expect(isShareRole(undefined)).toBe(false);
  });
});
