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
import { RevenueChart } from "@/components/revenue-chart";
import { getMonthlyRevenue } from "@/lib/data/kpi";
import { formatDate, formatEur, formatMonthYear } from "@/lib/format";

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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Compta mensuelle</h1>
        <p className="text-sm text-muted-foreground">
          CA net encaissé par mois · {months.length} mois · cumul{" "}
          <span className="font-medium">{formatEur(totalNet)}</span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Évolution mensuelle</CardTitle>
          <CardDescription>
            Bar bleue = mois finalisé · Bar ambre = mois en cours/provisoire
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={months} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par mois</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Charges</TableHead>
                <TableHead className="text-right">Brut encaissé</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Finalisé le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reversed.map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="font-medium capitalize">
                    {formatMonthYear(m.month)}
                  </TableCell>
                  <TableCell>
                    {m.revenue_status === "finalized" ? (
                      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                        Finalisé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Provisoire
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.succeeded_count}
                    {m.refund_count > 0 && (
                      <span className="text-purple-600 text-xs ml-1">
                        +{m.refund_count}↩
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEur(Number(m.gross_collected_eur ?? 0))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-purple-700">
                    {m.refund_amount_eur
                      ? `−${formatEur(Number(m.refund_amount_eur))}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatEur(Number(m.net_collected_eur ?? 0))}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {formatDate(m.finalized_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
