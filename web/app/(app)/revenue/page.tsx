import { PageHeader } from "@/components/page-header";
import { RevenueChart } from "@/components/revenue-chart";
import { RevenueTable } from "@/components/revenue-table";
import { getMonthlyRevenue } from "@/lib/data/kpi";
import { formatEur } from "@/lib/format";

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
        subtitle={`${months.length} mois · cumul net ${formatEur(totalNet)} · cliquez un mois pour le détail`}
      />

      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-ink">
            Évolution mensuelle du CA
          </h2>
          <p className="text-[12px] text-ink-soft mt-0.5">
            En indigo : mois finalisé · En ambre : mois provisoire (peut bouger)
          </p>
        </div>
        <div className="px-5 pb-5">
          <RevenueChart data={months} />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-ink">
            Détail par mois
          </h2>
          <p className="text-[12px] text-ink-soft mt-0.5">
            Cliquez une ligne pour voir les mensualités payées, échecs,
            remboursements et échéances à venir du mois.
          </p>
        </div>
        <RevenueTable rows={reversed} />
      </section>
    </div>
  );
}
