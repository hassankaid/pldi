"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  AlertTriangle,
  LineChart,
  LogOut,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/sales", label: "Ventes", icon: ShoppingCart },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/impayes", label: "Impayés", icon: AlertTriangle },
  { href: "/revenue", label: "Compta mensuelle", icon: LineChart },
  { href: "/review", label: "À auditer", icon: ClipboardCheck },
];

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Link href="/" className="font-semibold tracking-tight">
          PLDI&nbsp;Compta
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="px-3 py-2 mb-2 text-xs text-muted-foreground truncate">
          {userEmail}
        </div>
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Se déconnecter
          </Button>
        </form>
      </div>
    </aside>
  );
}
