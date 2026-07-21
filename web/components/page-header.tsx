import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="pb-1">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-faint">
          {breadcrumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-ink-faint" />}
              {c.href ? (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-gold-ink"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink-soft">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {eyebrow && (
        <div className="mb-3 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-ink">
          <span className="h-px w-[18px] bg-gold" />
          {eyebrow}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold leading-[1.02] tracking-[0.005em] text-ink sm:text-[38px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[13px] text-ink-soft">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      <div className="ledger-rule mt-5" />
    </div>
  );
}
