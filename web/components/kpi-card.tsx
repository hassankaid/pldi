import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Variant =
  | "default"
  | "warning"
  | "info"
  | "danger"
  | "success"
  | "refund"
  | "brand";

const numColor: Record<Variant, string> = {
  default: "text-ink",
  brand: "text-ink",
  warning: "text-warn",
  danger: "text-crit",
  info: "text-info",
  success: "text-pos",
  refund: "text-refund",
};

const iconBg: Record<Variant, string> = {
  default: "bg-surface-2 text-ink-soft",
  brand: "bg-gold-soft text-gold-ink",
  warning: "bg-warn-soft text-warn",
  danger: "bg-crit-soft text-crit",
  info: "bg-info-soft text-info",
  success: "bg-pos-soft text-pos",
  refund: "bg-refund-soft text-refund",
};

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  variant = "default",
  badge,
  icon: Icon,
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  delta?: number | null;
  variant?: Variant;
  badge?: ReactNode;
  icon?: LucideIcon;
}) {
  const hero = variant === "brand";
  return (
    <div
      className={cn(
        "flex min-h-[138px] flex-col rounded-xl border p-[18px] shadow-sm",
        hero
          ? "border-gold-line bg-surface [background:radial-gradient(130%_150%_at_100%_0%,var(--gold-soft),transparent_58%),var(--surface)]"
          : "border-line bg-surface",
      )}
    >
      <div className="flex h-[22px] items-center justify-between gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          {title}
        </span>
        {badge ??
          (Icon ? (
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md",
                iconBg[variant],
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
          ) : null)}
      </div>

      <div
        className={cn(
          "mt-4 flex items-baseline font-sans text-[30px] font-semibold leading-none tracking-[-0.022em] tabular-nums",
          numColor[variant],
        )}
      >
        {value}
      </div>

      <div className="mt-auto flex items-baseline justify-between gap-2 pt-3">
        {subtitle && (
          <span className="truncate text-[12px] text-ink-soft">{subtitle}</span>
        )}
        {delta !== null && delta !== undefined && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium tabular-nums",
              delta > 0
                ? "text-pos"
                : delta < 0
                  ? "text-crit"
                  : "text-ink-faint",
            )}
          >
            {delta > 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : delta < 0 ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
