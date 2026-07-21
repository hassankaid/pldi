import { AppSidebar } from "@/components/app-sidebar";
import { requireUser } from "@/lib/dal";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen overflow-hidden bg-ground">
      <AppSidebar userEmail={user.email ?? "—"} />
      <main className="flex-1 overflow-y-auto bg-ground">
        <div className="mx-auto max-w-[1500px] px-6 py-9 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
