import { PageHeader } from "@/components/page-header";
import { RevenueChart } from "@/components/revenue-chart";
import { getMonthlyRevenue } from "@/lib/data/kpi";
import { formatDate, formatEur, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const months = await getMonthlyRevenue(36);
  const reversed = [...months].reverse();
  const totalNet = months.reduce(
    (s, m) => s + Number(m.net_collected_eur ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compta mensuelle"
        subtitle={`${months.length} mois · cumul net ${formatEur(totalNet)}`}
      />

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-zinc-900">
            Évolution mensuelle du CA
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            En indigo : mois finalisé · En ambre : mois provisoire (peut bouger)
          </p>
        </div>
        <div className="px-5 pb-5">
          <RevenueChart data={months} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-zinc-900">
            Détail par mois
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-y border-zinc-100">
              <tr className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-2 text-left">Mois</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-right">Charges</th>
                <th className="px-3 py-2 text-right">Brut encaissé</th>
                <th className="px-3 py-2 text-right">Refunds</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-5 py-2 text-left">Finalisé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reversed.map((m) => (
                <tr
                  key={m.month}
                  className="hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-5 py-2.5 font-medium text-zinc-900 capitalize">
                    {formatMonthYear(m.month)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        m.revenue_status === "finalized"
                          ? "bg-sky-50 text-sky-700"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          m.revenue_status === "finalized"
                            ? "bg-sky-500"
                            : "bg-amber-500",
                        )}
                      />
                      {m.revenue_status === "finalized" ? "Finalisé" : "Provisoire"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                    {m.succeeded_count}
                    {m.refund_count > 0 && (
                      <span className="text-violet-600 text-[11px] ml-1">
                        +{m.refund_count}↩
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                    {formatEur(Number(m.gross_collected_eur ?? 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-violet-700">
                    {m.refund_amount_eur
                      ? `−${formatEur(Number(m.refund_amount_eur))}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-zinc-900 whitespace-nowrap">
                    {formatEur(Number(m.net_collected_eur ?? 0))}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[12px] text-zinc-500">
                    {formatDate(m.finalized_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
