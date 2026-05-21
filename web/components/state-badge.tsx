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

const variants: Record<string, { dot: string; text: string; bg: string }> = {
  active: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  completed: { dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  canceled: { dot: "bg-zinc-400", text: "text-zinc-600", bg: "bg-zinc-100" },
  refunded: { dot: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50" },
  defaulted: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  paid: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  scheduled: { dot: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
  in_retry: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  late: { dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
  missed: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
  succeeded: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  failed: { dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50" },
};

export function StateBadge({ state }: { state: string }) {
  const v = variants[state] ?? variants.canceled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        v.bg,
        v.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", v.dot)} />
      {labels[state] ?? state}
    </span>
  );
}

export function PaymentTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    multipay: {
      label: "Plan ×N",
      bg: "bg-indigo-50",
      text: "text-indigo-700",
    },
    single: { label: "One-shot", bg: "bg-blue-50", text: "text-blue-700" },
    subscription: {
      label: "Abonnement",
      bg: "bg-violet-50",
      text: "text-violet-700",
    },
    free: { label: "Gratuit", bg: "bg-zinc-100", text: "text-zinc-600" },
  };
  const entry = map[type ?? ""] ?? {
    label: type ?? "—",
    bg: "bg-zinc-100",
    text: "text-zinc-600",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        entry.bg,
        entry.text,
      )}
    >
      {entry.label}
    </span>
  );
}
