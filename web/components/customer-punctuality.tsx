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
      ? "text-zinc-400"
      : onTimeRate >= 90
        ? "text-emerald-600"
        : onTimeRate >= 70
          ? "text-amber-600"
          : "text-red-600";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-[13px] font-semibold text-zinc-900">
          Ponctualité des paiements
        </h2>
        <p className="text-[12px] text-zinc-500 mt-0.5">
          Tous plans confondus · estimé d'après l'échéancier (multipay couvert)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Avancement */}
        <div className="sm:pr-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
            Avancement
          </div>
          <div className="text-[20px] font-semibold tabular-nums text-zinc-900 mt-1">
            {data.installments_paid}/{data.total_planned}
            <span className="text-[12px] font-normal text-zinc-500 ml-1.5">
              échéances payées
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[11px] text-zinc-500 mt-1.5">
            {remaining} restante{remaining > 1 ? "s" : ""} ·{" "}
            {data.plans_count} plan{data.plans_count > 1 ? "s" : ""}
          </div>
        </div>

        {/* Ponctualité */}
        <div className="sm:px-5 sm:border-l sm:border-zinc-100">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
            Ponctualité
          </div>
          <div className="text-[20px] font-semibold tabular-nums mt-1">
            <span className="text-zinc-900">{data.paid_on_time} à temps</span>
            <span className="text-[14px] text-zinc-400 mx-1.5">·</span>
            <span
              className={data.paid_late > 0 ? "text-amber-600" : "text-zinc-400"}
            >
              {data.paid_late} en retard
            </span>
          </div>
          <div className={cn("text-[12px] font-medium mt-1.5", rateTone)}>
            {onTimeRate !== null ? `${onTimeRate}% à temps` : "—"}
          </div>
        </div>

        {/* Risque actuel */}
        <div className="sm:pl-5 sm:border-l sm:border-zinc-100">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">
            Risque actuel
          </div>
          {data.overdue_count > 0 ? (
            <>
              <div className="text-[20px] font-semibold tabular-nums text-amber-600 mt-1">
                {data.overdue_count} impayé{data.overdue_count > 1 ? "s" : ""}
              </div>
              <div className="text-[12px] text-amber-600 mt-1.5">
                {formatEur(Number(data.overdue_eur))}
                <span className="text-zinc-400 ml-1.5 text-[11px]">· estimé</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[20px] font-semibold text-emerald-600 mt-1">
                À jour
              </div>
              <div className="text-[12px] text-zinc-500 mt-1.5">
                Aucune échéance en retard
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
