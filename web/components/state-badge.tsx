import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  active: "Actif",
  completed: "Complété",
  canceled: "Annulé",
  refunded: "Remboursé",
  defaulted: "Défaut",
  paid: "Payé",
  scheduled: "Prévu",
  in_retry: "Retry",
  late: "En retard",
  missed: "Manqué",
};

const variants: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-sky-100 text-sky-700 border-sky-200",
  canceled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  refunded: "bg-purple-100 text-purple-700 border-purple-200",
  defaulted: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  scheduled: "bg-sky-100 text-sky-700 border-sky-200",
  in_retry: "bg-amber-100 text-amber-700 border-amber-200",
  late: "bg-orange-100 text-orange-700 border-orange-200",
  missed: "bg-red-100 text-red-700 border-red-200",
};

export function StateBadge({ state }: { state: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        variants[state] ?? "bg-zinc-100 text-zinc-700 border-zinc-200",
      )}
    >
      {labels[state] ?? state}
    </Badge>
  );
}

export function PaymentTypeBadge({ type }: { type: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    multipay: { label: "Plan ×N", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    single: { label: "One-shot", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    subscription: { label: "Abonnement", cls: "bg-violet-100 text-violet-700 border-violet-200" },
    free: { label: "Gratuit", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
  };
  const entry = map[type ?? ""] ?? { label: type ?? "—", cls: "" };
  return (
    <Badge variant="outline" className={cn("font-medium", entry.cls)}>
      {entry.label}
    </Badge>
  );
}
