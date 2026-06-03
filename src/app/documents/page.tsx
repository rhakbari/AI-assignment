import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import DashboardClient from "@/components/DashboardClient";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <DashboardClient />
      </main>
    </>
  );
}
