import Link from "next/link";
import { TrendingUp, Receipt, Undo2, XCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { RevenueChart } from "@/components/revenue-chart";
import { PeriodSelector } from "@/components/period-selector";
import {
  getDashboardKPIs,
  getPeriodKPIs,
  getMonthlyRevenueRange,
  getTopCustomers,
} from "@/lib/data/kpi";
import { resolvePeriod, monthStart } from "@/lib/period";
import { formatEur, formatInteger } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const period = resolvePeriod({
    preset: one("preset"),
    from: one("from"),
    to: one("to"),
  });

  const [kpis, pk, revenue, topCustomers] = await Promise.all([
    getDashboardKPIs(),
    getPeriodKPIs(period.from, period.to),
    getMonthlyRevenueRange(monthStart(period.from), period.to),
    getTopCustomers(10),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vue d'ensemble"
        subtitle="Pilotage compta Kajabi · filtrable par période"
        actions={<PeriodSelector current={period} />}
      />

      {/* Period revenue KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          title="CA net encaissé"
          value={formatEur(pk.net_eur)}
          subtitle={`${formatInteger(pk.succeeded_count)} encaissements · ${period.label}`}
          variant="brand"
          icon={TrendingUp}
        />
        <KpiCard
          title="CA brut"
          value={formatEur(pk.gross_eur)}
          subtitle="avant remboursements"
          variant="default"
          icon={Receipt}
        />
        <KpiCard
          title="Remboursé"
          value={pk.refund_eur > 0 ? `−${formatEur(pk.refund_eur)}` : "—"}
          subtitle={`${pk.refund_count} remboursement${pk.refund_count > 1 ? "s" : ""}`}
          variant={pk.refund_eur > 0 ? "refund" : "default"}
          icon={Undo2}
        />
        <KpiCard
          title="Échecs de paiement"
          value={formatInteger(pk.failed_count)}
          subtitle={`${formatEur(pk.failed_eur)} tentés`}
          variant={pk.failed_count > 0 ? "danger" : "default"}
          icon={XCircle}
        />
      </div>

      {/* Revenue chart (period) */}
      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-ink">
            Évolution du CA net
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {period.label} · net encaissé (charges réussies − remboursements)
          </p>
        </div>
        <div className="px-5 pb-5">
          {revenue.length > 0 ? (
            <RevenueChart data={revenue} />
          ) : (
            <div className="py-12 text-center text-[13px] text-ink-faint">
              Aucun encaissement sur cette période.
            </div>
          )}
        </div>
      </section>

      {/* Secondary : impayés (current state) + top customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-surface p-5">
          <div className="mb-3 text-[12px] font-medium uppercase tracking-wide text-ink-faint">
            Impayés historiques
          </div>
          <div className="text-[28px] font-semibold leading-none tracking-tight text-crit tabular-nums">
            {formatEur(kpis.impayesMissedEur)}
          </div>
          <div className="mt-2 text-[12px] text-ink-soft">
            {kpis.impayesMissedCount} échéances « missed » (&gt;21j)
          </div>
          <div className="mt-5 space-y-2 border-t border-line-soft pt-4">
            <Row label="Refunds émis (total)" value={formatEur(kpis.totalRefundsEur)} />
            <Row label="Ventes actives" value={formatInteger(kpis.activeSales)} />
          </div>
          <Link
            href="/impayes"
            className="mt-5 inline-flex items-center gap-1 text-[12px] font-medium text-gold-ink transition-colors hover:text-gold"
          >
            Voir tous les impayés
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>

        <section className="rounded-xl border border-line bg-surface lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Top 10 clients</h2>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                Triés par cumul de paiements nets reçus
              </p>
            </div>
            <Link
              href="/customers"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Tous les clients
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-gold-line">
                <tr className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  <th className="px-5 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-right">Ventes</th>
                  <th className="px-3 py-2 text-right">Total payé</th>
                  <th className="px-5 py-2 text-right">Impayés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {topCustomers.map((c) => (
                  <tr
                    key={c.customer_id}
                    className="transition-colors hover:bg-surface-2"
                  >
                    <td className="px-5 py-2.5">
                      <Link href={`/customers/${c.customer_id}`} className="block">
                        <div className="truncate font-medium text-ink">
                          {c.name ?? "—"}
                        </div>
                        <div className="truncate text-[11px] text-ink-soft">
                          {c.email}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                      {c.total_sales}
                      <span className="ml-1 text-[11px] text-ink-faint">
                        ({c.active_sales})
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-ink">
                      {formatEur(Number(c.total_paid_eur))}
                    </td>
                    <td className="whitespace-nowrap px-5 py-2.5 text-right tabular-nums">
                      {c.impaye_count_estimated > 0 ? (
                        <span className="text-warn">
                          {formatEur(Number(c.impaye_amount_eur_estimated))}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
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
      <span className="text-[12px] text-ink-soft">{label}</span>
      <span className="text-[13px] font-medium tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}
