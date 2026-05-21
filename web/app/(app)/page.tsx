import Link from "next/link";
import {
  TrendingUp,
  CalendarDays,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { RevenueChart } from "@/components/revenue-chart";
import {
  getDashboardKPIs,
  getMonthlyRevenue,
  getTopCustomers,
} from "@/lib/data/kpi";
import {
  formatEur,
  formatEurCents,
  formatInteger,
  formatMonthYear,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, revenue, topCustomers] = await Promise.all([
    getDashboardKPIs(),
    getMonthlyRevenue(18),
    getTopCustomers(10),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Pilotage compta Kajabi · source API publique en lecture live"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="CA net historique"
          value={formatEurCents(kpis.totalNetCollectedCents)}
          subtitle={`${formatInteger(kpis.totalSales)} ventes · factuel`}
          variant="success"
          icon={TrendingUp}
        />
        <KpiCard
          title="CA ce mois"
          value={formatEur(kpis.currentMonthEur)}
          subtitle={
            kpis.currentMonthLabel
              ? `${formatMonthYear(kpis.currentMonthLabel)} · provisoire`
              : "—"
          }
          delta={kpis.monthOverMonthPct}
          variant="brand"
          icon={CalendarDays}
        />
        <KpiCard
          title="À relancer"
          value={formatEur(kpis.impayesActionableEur)}
          subtitle={`${kpis.impayesActionableCount} échéances · estimé 63%`}
          variant="warning"
          icon={AlertTriangle}
        />
        <KpiCard
          title="À percevoir 90j"
          value={formatEur(kpis.receivable90dEur)}
          subtitle="Échéances multipay projetées"
          variant="info"
          icon={Clock}
        />
      </div>

      {/* Revenue chart */}
      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-zinc-900">
            Évolution du CA
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            18 derniers mois — net encaissé (charges réussies − refunds)
          </p>
        </div>
        <div className="px-5 pb-5">
          <RevenueChart data={revenue} />
        </div>
      </section>

      {/* Secondary grid : impayés summary + top customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Impayés historiques
          </div>
          <div className="text-[28px] font-semibold tabular-nums leading-none tracking-tight text-red-600">
            {formatEur(kpis.impayesMissedEur)}
          </div>
          <div className="text-[12px] text-zinc-500 mt-2">
            {kpis.impayesMissedCount} échéances « missed » (&gt;21j)
          </div>
          <div className="mt-5 pt-4 border-t border-zinc-100 space-y-2">
            <Row
              label="Refunds émis"
              value={formatEur(kpis.totalRefundsEur)}
            />
            <Row
              label="Ventes actives"
              value={formatInteger(kpis.activeSales)}
            />
          </div>
          <Link
            href="/impayes"
            className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            Voir tous les impayés
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-zinc-900">
                Top 10 clients
              </h2>
              <p className="text-[12px] text-zinc-500 mt-0.5">
                Triés par cumul de paiements nets reçus
              </p>
            </div>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-600 hover:text-zinc-900"
            >
              Tous les clients
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-y border-zinc-100">
                <tr className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-right">Ventes</th>
                  <th className="px-3 py-2 text-right">Total payé</th>
                  <th className="px-5 py-2 text-right">Impayés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topCustomers.map((c) => (
                  <tr
                    key={c.customer_id}
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/customers/${c.customer_id}`}
                        className="block"
                      >
                        <div className="font-medium text-zinc-900 truncate">
                          {c.name ?? "—"}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {c.email}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                      {c.total_sales}
                      <span className="text-[11px] text-zinc-400 ml-1">
                        ({c.active_sales})
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-zinc-900 whitespace-nowrap">
                      {formatEur(Number(c.total_paid_eur))}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {c.impaye_count_estimated > 0 ? (
                        <span className="text-amber-600">
                          {formatEur(Number(c.impaye_amount_eur_estimated))}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[12px] text-zinc-500">{label}</span>
      <span className="text-[13px] font-medium tabular-nums text-zinc-900">
        {value}
      </span>
    </div>
  );
}
