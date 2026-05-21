import { AppSidebar } from "@/components/app-sidebar";
import { requireUser } from "@/lib/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <AppSidebar userEmail={user.email ?? "—"} />
      <main className="flex-1 overflow-y-auto bg-zinc-50/30">
        <div className="px-6 lg:px-10 py-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
