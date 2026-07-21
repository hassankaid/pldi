import { cn } from "@/lib/utils";
import { formatEur } from "@/lib/format";
import type { CustomerPunctuality } from "@/lib/data/customer";

export function PunctualityBanner({
  data,
}: {
  data: CustomerPunctuality | null;
}) {
  if (!data || data.total_planned === 0) {
    return null;
  }

  const paidTotal = data.paid_on_time + data.paid_late;
  const onTimeRate =
    paidTotal > 0 ? Math.round((data.paid_on_time / paidTotal) * 100) : null;
  const progressPct =
    data.total_planned > 0
      ? Math.min(100, Math.round((data.installments_paid / data.total_planned) * 100))
      : 0;
  const remaining = Math.max(0, data.total_planned - data.installments_paid);

  const rateTone =
    onTimeRate === null
      ? "text-ink-faint"
      : onTimeRate >= 90
        ? "text-pos"
        : onTimeRate >= 70
          ? "text-warn"
          : "text-crit";

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4">
        <h2 className="text-[13px] font-semibold text-ink">
          Ponctualité des paiements
        </h2>
        <p className="text-[12px] text-ink-soft mt-0.5">
          Tous plans confondus · estimé d'après l'échéancier (multipay couvert)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Avancement */}
        <div className="sm:pr-5">
          <div className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">
            Avancement
          </div>
          <div className="text-[20px] font-semibold tabular-nums text-ink mt-1">
            {data.installments_paid}/{data.total_planned}
            <span className="text-[12px] font-normal text-ink-soft ml-1.5">
              échéances payées
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] text-ink-soft mt-1.5">
            {remaining} restante{remaining > 1 ? "s" : ""} ·{" "}
            {data.plans_count} plan{data.plans_count > 1 ? "s" : ""}
          </div>
        </div>

        {/* Ponctualité */}
        <div className="sm:px-5 sm:border-l sm:border-line-soft">
          <div className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">
            Ponctualité
          </div>
          <div className="text-[20px] font-semibold tabular-nums mt-1">
            <span className="text-ink">{data.paid_on_time} à temps</span>
            <span className="text-[14px] text-ink-faint mx-1.5">·</span>
            <span
              className={data.paid_late > 0 ? "text-warn" : "text-ink-faint"}
            >
              {data.paid_late} en retard
            </span>
          </div>
          <div className={cn("text-[12px] font-medium mt-1.5", rateTone)}>
            {onTimeRate !== null ? `${onTimeRate}% à temps` : "—"}
          </div>
        </div>

        {/* Risque actuel */}
        <div className="sm:pl-5 sm:border-l sm:border-line-soft">
          <div className="text-[11px] font-medium text-ink-faint uppercase tracking-wide">
            Risque actuel
          </div>
          {data.overdue_count > 0 ? (
            <>
              <div className="text-[20px] font-semibold tabular-nums text-warn mt-1">
                {data.overdue_count} impayé{data.overdue_count > 1 ? "s" : ""}
              </div>
              <div className="text-[12px] text-warn mt-1.5">
                {formatEur(Number(data.overdue_eur))}
                <span className="text-ink-faint ml-1.5 text-[11px]">· estimé</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[20px] font-semibold text-pos mt-1">
                À jour
              </div>
              <div className="text-[12px] text-ink-soft mt-1.5">
                Aucune échéance en retard
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
