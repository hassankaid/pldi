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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <aside className="hidden md:flex md:w-64 md:flex-col bg-surface border-r border-line">
      {/* Brand */}
      <div className="flex h-16 items-center px-5 border-b border-line">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-line bg-gold-soft font-display text-lg font-semibold text-gold-ink">
            ✦
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-wide text-ink transition-colors group-hover:text-gold-ink">
              PLDI
            </span>
            <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.22em] text-ink-faint">
              Comptabilité
            </span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-faint">
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
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
                      active
                        ? "bg-gold-soft text-gold-ink font-medium"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full bg-gold" />
                    )}
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px] shrink-0",
                        active
                          ? "text-gold-ink"
                          : "text-ink-faint group-hover:text-ink-soft",
                      )}
                      strokeWidth={1.75}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-line-soft p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[#8f6f22] text-[12px] font-semibold text-[#1b1710]">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-ink">
              {userEmail}
            </div>
            <div className="text-[11px] text-ink-faint">Admin</div>
          </div>
          <ThemeToggle />
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
