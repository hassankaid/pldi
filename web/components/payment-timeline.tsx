import { cn } from "@/lib/utils";
import { formatDate, formatEurCents } from "@/lib/format";
import type { TimelineEvent } from "@/lib/data/customer";

type Kind =
  | "on_time"
  | "late_paid"
  | "charged"
  | "missed"
  | "late"
  | "in_retry"
  | "scheduled";

function classify(e: TimelineEvent): Kind {
  if (e.status === "paid") {
    if (e.source === "payment") return "charged";
    if (e.days_late_paid != null && e.days_late_paid > 0) return "late_paid";
    return "on_time";
  }
  if (e.status === "missed") return "missed";
  if (e.status === "late") return "late";
  if (e.status === "in_retry") return "in_retry";
  return "scheduled";
}

const DOT: Record<Kind, string> = {
  on_time: "bg-emerald-500",
  charged: "bg-emerald-500",
  late_paid: "bg-amber-500",
  in_retry: "bg-amber-500",
  late: "bg-orange-500",
  missed: "bg-red-500",
  scheduled: "bg-zinc-300",
};

const LABEL: Record<Kind, string> = {
  on_time: "Payé à temps",
  charged: "Encaissé",
  late_paid: "Payé en retard",
  in_retry: "Retry en cours",
  late: "En retard",
  missed: "Manqué",
  scheduled: "À venir",
};

const TEXT: Record<Kind, string> = {
  on_time: "text-emerald-700",
  charged: "text-emerald-700",
  late_paid: "text-amber-700",
  in_retry: "text-amber-700",
  late: "text-orange-700",
  missed: "text-red-700",
  scheduled: "text-zinc-500",
};

export function PaymentTimeline({ events }: { events: TimelineEvent[] }) {
  // Hide canceled installments (plan deactivated before due) — noise.
  const visible = events.filter((e) => e.status !== "canceled");

  if (visible.length === 0) {
    return null;
  }

  // Most recent first reads better for "where are they now"
  const ordered = [...visible].reverse();

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-zinc-900">
            Échéancier &amp; historique de paiement
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Chronologique (du plus récent au plus ancien) · tous plans confondus
          </p>
        </div>
        <Legend />
      </div>

      <div className="px-5 pb-5 max-h-[28rem] overflow-y-auto">
        <ol className="relative border-l border-zinc-200 ml-1.5">
          {ordered.map((e, i) => {
            const k = classify(e);
            const amount =
              e.status === "paid" && e.paid_amount_cents != null
                ? e.paid_amount_cents
                : e.amount_cents;
            const planLabel =
              e.source === "schedule" && e.planned_installments
                ? `Éch. ${e.installment_n}/${e.planned_installments}`
                : e.payment_type === "subscription"
                  ? "Prélèvement"
                  : "Paiement";
            return (
              <li key={`${e.sale_id}-${e.installment_n}-${i}`} className="ml-4 py-2.5">
                <span
                  className={cn(
                    "absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                    DOT[k],
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-zinc-900 tabular-nums">
                        {formatDate(e.event_date)}
                      </span>
                      <span className="text-[11px] text-zinc-400">·</span>
                      <span className="text-[12px] text-zinc-600">
                        {planLabel}
                      </span>
                    </div>
                    <div className="text-[12px] text-zinc-500 truncate max-w-md mt-0.5">
                      {e.offer_label_snapshot ?? "—"}
                    </div>
                    {e.status === "paid" &&
                      e.source === "schedule" &&
                      e.paid_at && (
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          payé le {formatDate(e.paid_at)}
                          {e.days_late_paid != null && e.days_late_paid > 0 && (
                            <span className="text-amber-600 ml-1">
                              (+{e.days_late_paid}j)
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-medium tabular-nums text-zinc-900 whitespace-nowrap">
                      {formatEurCents(amount)}
                    </div>
                    <div className={cn("text-[11px] font-medium mt-0.5", TEXT[k])}>
                      {LABEL[k]}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function Legend() {
  const items: { color: string; label: string }[] = [
    { color: "bg-emerald-500", label: "À temps" },
    { color: "bg-amber-500", label: "En retard" },
    { color: "bg-red-500", label: "Manqué" },
    { color: "bg-zinc-300", label: "À venir" },
  ];
  return (
    <div className="hidden sm:flex items-center gap-3">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"
        >
          <span className={cn("h-2 w-2 rounded-full", it.color)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
