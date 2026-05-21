import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "default" | "warning" | "info" | "danger" | "success";

export function KpiCard({
  title,
  value,
  subtitle,
  delta,
  variant = "default",
  badge,
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  delta?: number | null;
  variant?: Variant;
  badge?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="truncate">{title}</span>
        {badge}
      </div>
      <div
        className={cn(
          "text-2xl font-bold mt-2 tabular-nums",
          variant === "warning" && "text-amber-600",
          variant === "danger" && "text-red-600",
          variant === "info" && "text-sky-600",
          variant === "success" && "text-emerald-600",
        )}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      )}
      {delta !== null && delta !== undefined && (
        <div
          className={cn(
            "mt-2 inline-flex items-center text-xs font-medium",
            delta >= 0 ? "text-emerald-600" : "text-red-600",
          )}
        >
          {delta >= 0 ? (
            <ArrowUp className="h-3 w-3 mr-1" />
          ) : (
            <ArrowDown className="h-3 w-3 mr-1" />
          )}
          {Math.abs(delta).toFixed(1)}% vs M-1
        </div>
      )}
    </Card>
  );
}
