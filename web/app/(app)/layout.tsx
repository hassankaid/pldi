import { AppSidebar } from "@/components/app-sidebar";
import { requireUser } from "@/lib/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar userEmail={user.email ?? "—"} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
