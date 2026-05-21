import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "default" | "warning" | "info" | "danger" | "success" | "brand";

const variantColors: Record<Variant, string> = {
  default: "text-zinc-900",
  brand: "text-indigo-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  info: "text-sky-600",
  success: "text-emerald-600",
};

const iconBg: Record<Variant, string> = {
  default: "bg-zinc-100 text-zinc-600",
  brand: "bg-indigo-50 text-indigo-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-sky-50 text-sky-600",
  success: "bg-emerald-50 text-emerald-600",
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
  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide">
          {title}
        </div>
        {Icon ? (
          <div
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center",
              iconBg[variant],
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
        ) : (
          badge
        )}
      </div>

      <div
        className={cn(
          "text-[28px] font-semibold mt-3 tabular-nums leading-none tracking-tight",
          variantColors[variant],
        )}
      >
        {value}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-3 min-h-[18px]">
        {subtitle && (
          <div className="text-[12px] text-zinc-500 leading-tight">
            {subtitle}
          </div>
        )}
        {delta !== null && delta !== undefined && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
              delta > 0
                ? "text-emerald-600"
                : delta < 0
                  ? "text-red-600"
                  : "text-zinc-500",
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
          </div>
        )}
      </div>
    </div>
  );
}
