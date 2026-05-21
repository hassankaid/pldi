"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartLine,
  Receipt,
  Users,
  AlertOctagon,
  CalendarClock,
  ClipboardList,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof ChartLine;
};

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Pilotage",
    items: [
      { href: "/", label: "Vue d'ensemble", icon: ChartLine },
      { href: "/revenue", label: "Compta mensuelle", icon: CalendarClock },
    ],
  },
  {
    label: "Données",
    items: [
      { href: "/sales", label: "Ventes", icon: Receipt },
      { href: "/customers", label: "Clients", icon: Users },
    ],
  },
  {
    label: "Actions",
    items: [
      { href: "/impayes", label: "Impayés", icon: AlertOctagon },
      { href: "/review", label: "À auditer", icon: ClipboardList },
    ],
  },
];

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col bg-zinc-50/50 border-r border-zinc-200">
      {/* Brand */}
      <div className="flex h-14 items-center px-4 border-b border-zinc-200">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-zinc-900 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
              PLDI
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 tracking-wider uppercase">
              Compta
            </span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1.5 text-[10px] font-medium tracking-wider uppercase text-zinc-400">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
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
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-white" : "text-zinc-400 group-hover:text-zinc-600",
                      )}
                      strokeWidth={active ? 2 : 1.75}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-900 truncate">
              {userEmail}
            </div>
            <div className="text-[10px] text-zinc-500 mt-px">Admin</div>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 transition-colors"
          >
            <LogOut className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
