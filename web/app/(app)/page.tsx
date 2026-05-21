import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Vue d'ensemble</h1>
        <p className="text-sm text-muted-foreground">
          Pilotage compta Kajabi · Source : API Public (live)
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="CA net encaissé (historique)"
          value={formatEurCents(kpis.totalNetCollectedCents)}
          subtitle={`${formatInteger(kpis.totalSales)} ventes · factuel ✓`}
          variant="success"
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
          badge={
            <Badge variant="outline" className="text-[10px] font-normal">
              factuel
            </Badge>
          }
        />
        <KpiCard
          title="À relancer cette semaine"
          value={formatEur(kpis.impayesActionableEur)}
          subtitle={`${kpis.impayesActionableCount} échéances (in_retry + late)`}
          variant="warning"
          badge={
            <Badge variant="outline" className="text-[10px] font-normal">
              estimé 63%
            </Badge>
          }
        />
        <KpiCard
          title="À percevoir 90j"
          value={formatEur(kpis.receivable90dEur)}
          subtitle="Échéances multipay projetées"
          variant="info"
          badge={
            <Badge variant="outline" className="text-[10px] font-normal">
              estimé 63%
            </Badge>
          }
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>CA mensuel — 18 derniers mois</CardTitle>
          <CardDescription>
            Net encaissé (charges réussies moins refunds). Les mois en cours et
            M-1 restent provisoires jusqu'à J+21 du mois suivant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue} />
        </CardContent>
      </Card>

      {/* Secondary KPIs + Top customers side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Impayés historiques</CardTitle>
            <CardDescription>Échéances « missed » (&gt;21j)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-red-600">
              {formatEur(kpis.impayesMissedEur)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {kpis.impayesMissedCount} échéances
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Total refunds émis :{" "}
              <span className="font-medium">
                {formatEur(kpis.totalRefundsEur)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Ventes actives :{" "}
              <span className="font-medium">
                {formatInteger(kpis.activeSales)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top 10 clients par CA</CardTitle>
            <CardDescription>Cumul des paiements nets reçus</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">Total payé</TableHead>
                  <TableHead className="text-right">Impayés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c) => (
                  <TableRow key={c.customer_id}>
                    <TableCell>
                      <Link
                        href={`/customers/${c.customer_id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{c.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.email}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.total_sales}
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        ({c.active_sales} actives)
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatEur(Number(c.total_paid_eur))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">
                      {c.impaye_count_estimated > 0
                        ? formatEur(Number(c.impaye_amount_eur_estimated))
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
