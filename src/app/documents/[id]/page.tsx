import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canView, effectiveRole } from "@/lib/access";
import AppHeader from "@/components/AppHeader";
import DocumentEditor from "@/components/DocumentEditor";

type Params = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: Params) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      shares: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!doc || !canView(doc, user.id)) {
    return (
      <>
        <AppHeader user={user} />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Document unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            It may have been deleted, or you don&apos;t have access to it.
          </p>
          <Link
            href="/documents"
            className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Back to documents
          </Link>
        </main>
      </>
    );
  }

  const role = effectiveRole(doc, user.id)!;
  const isOwner = role === "OWNER";

  return (
    <>
      <AppHeader user={user} />
      <DocumentEditor
        currentUserId={user.id}
        initial={{
          id: doc.id,
          title: doc.title,
          content: doc.content,
          updatedAt: doc.updatedAt.toISOString(),
          role,
          owner: { name: doc.owner.name, email: doc.owner.email },
          shares: isOwner
            ? doc.shares.map((s) => ({
                userId: s.userId,
                role: s.role as "VIEWER" | "COMMENTER" | "EDITOR",
                name: s.user.name,
                email: s.user.email,
              }))
            : [],
        }}
      />
    </>
  );
}
