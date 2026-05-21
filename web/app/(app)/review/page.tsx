import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
import { getReviewList } from "@/lib/data/review";
import { formatDate, formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const rows = await getReviewList();
  const noCoverage = rows.filter((r) => r.issue_type === "no_coverage");
  const overpayment = rows.filter((r) => r.issue_type === "overpayment");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ventes à auditer</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} ventes multipay nécessitent une revue manuelle pour
          fiabiliser la projection
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">
            Sans couverture (pas de projection)
          </div>
          <div className="text-2xl font-bold tabular-nums mt-1">
            {noCoverage.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ventes — {formatEur(noCoverage.reduce((s, r) => s + Number(r.total_paid_eur ?? 0), 0))} déjà payés
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">
            Surpaiements (plan probablement plus long)
          </div>
          <div className="text-2xl font-bold tabular-nums mt-1">
            {overpayment.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ventes — {formatEur(overpayment.reduce((s, r) => s + Number(r.total_paid_eur ?? 0), 0))} déjà payés
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des ventes à auditer</CardTitle>
          <CardDescription>
            Triées par montant déjà payé (priorité aux plus gros). Cliquez sur
            une vente pour voir tous les paiements et confronter à la réalité.
            <br />
            Pour corriger, insérez le vrai nombre d'échéances dans la table{" "}
            <code className="text-xs">app.manual_plan_overrides</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Offre (internal_title)</TableHead>
                <TableHead className="text-right">Par échéance</TableHead>
                <TableHead className="text-right">Payés</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Vendu</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sale_id}>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {r.customer_name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.customer_email}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm truncate text-sm">
                    {r.offer_internal_title ?? r.offer_public_title ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatEur(Number(r.amount_per_installment_eur))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.installments_paid_so_far}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-sm">
                    {formatEur(Number(r.total_paid_eur))}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {formatDate(r.sold_at)}
                  </TableCell>
                  <TableCell>
                    {r.issue_type === "no_coverage" ? (
                      <Badge
                        variant="outline"
                        className="bg-zinc-50 text-zinc-700 border-zinc-200 text-[10px]"
                      >
                        sans projection
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                      >
                        surpayé (≥{r.estimated_planned_installments})
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/sales/${r.sale_id}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
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
