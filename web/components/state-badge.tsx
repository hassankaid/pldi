import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  active: "Actif",
  completed: "Complété",
  canceled: "Annulé",
  refunded: "Remboursé",
  defaulted: "En défaut",
  paid: "Payé",
  scheduled: "Prévu",
  in_retry: "Retry",
  late: "En retard",
  missed: "Manqué",
  succeeded: "Succès",
  failed: "Échec",
};

// dot + text + soft background, all from the brand semantic tokens
const variants: Record<string, { dot: string; cls: string }> = {
  active: { dot: "bg-pos", cls: "bg-pos-soft text-pos" },
  paid: { dot: "bg-pos", cls: "bg-pos-soft text-pos" },
  succeeded: { dot: "bg-pos", cls: "bg-pos-soft text-pos" },
  completed: { dot: "bg-info", cls: "bg-info-soft text-info" },
  scheduled: { dot: "bg-info", cls: "bg-info-soft text-info" },
  canceled: { dot: "bg-ink-faint", cls: "bg-surface-2 text-ink-soft" },
  refunded: { dot: "bg-refund", cls: "bg-refund-soft text-refund" },
  in_retry: { dot: "bg-warn", cls: "bg-warn-soft text-warn" },
  late: { dot: "bg-warn", cls: "bg-warn-soft text-warn" },
  defaulted: { dot: "bg-crit", cls: "bg-crit-soft text-crit" },
  missed: { dot: "bg-crit", cls: "bg-crit-soft text-crit" },
  failed: { dot: "bg-crit", cls: "bg-crit-soft text-crit" },
};

export function StateBadge({ state }: { state: string }) {
  const v = variants[state] ?? variants.canceled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        v.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
      {labels[state] ?? state}
    </span>
  );
}

export function PaymentTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    multipay: { label: "Plan ×N", cls: "bg-gold-soft text-gold-ink" },
    single: { label: "One-shot", cls: "bg-info-soft text-info" },
    subscription: {
      label: "Abonnement",
      cls: "bg-surface-2 text-ink-soft border border-line",
    },
    free: { label: "Gratuit", cls: "bg-surface-2 text-ink-faint" },
  };
  const entry = map[type ?? ""] ?? {
    label: type ?? "—",
    cls: "bg-surface-2 text-ink-soft",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        entry.cls,
      )}
    >
      {entry.label}
    </span>
  );
}
