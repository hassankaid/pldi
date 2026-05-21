import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import {
  getSaleById,
  getPaymentsForSale,
  getScheduleForSale,
} from "@/lib/data/sales";
import {
  formatDate,
  formatDateLong,
  formatEur,
  formatEurCents,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [sale, payments, schedule] = await Promise.all([
    getSaleById(id),
    getPaymentsForSale(id),
    getScheduleForSale(id),
  ]);

  if (!sale) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/sales"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour aux ventes
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PaymentTypeBadge type={sale.payment_type} />
            <StateBadge state={sale.state_business} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {sale.offer_label_snapshot ?? sale.offer_title_public_snapshot ?? "Vente"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sale&nbsp;ID : <span className="font-mono">{sale.sale_id}</span> ·
            Client :{" "}
            <Link
              href={`/customers/${sale.customer_id}`}
              className="font-mono hover:underline"
            >
              {sale.customer_id}
            </Link>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Encaissé net</div>
          <div className="text-2xl font-bold tabular-nums">
            {formatEurCents(sale.net_collected_cents)}
          </div>
          {sale.refund_cents != null && sale.refund_cents > 0 && (
            <div className="text-xs text-amber-600">
              dont {formatEurCents(sale.refund_cents)} de refunds
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails de la vente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <Row label="Vendue le" value={formatDateLong(sale.sold_at)} />
            <Row
              label="Début effectif"
              value={formatDateLong(sale.effective_start_at)}
            />
            <Row
              label="Par échéance"
              value={
                <span>
                  {formatEurCents(sale.amount_per_installment_cents)}
                  {sale.amount_source && (
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {sale.amount_source === "observed"
                        ? "via paiements"
                        : "via purchase"}
                    </Badge>
                  )}
                </span>
              }
            />
            {sale.amount_source === "purchase_fallback" &&
              sale.amount_per_installment_cents_raw !== null && (
                <Row
                  label="Brut purchase"
                  value={
                    <span className="text-amber-600">
                      {formatEurCents(sale.amount_per_installment_cents_raw)}
                    </span>
                  }
                />
              )}
            <Row label="Devise" value={sale.currency ?? "—"} />
            {sale.coupon_code && (
              <Row label="Coupon" value={<code>{sale.coupon_code}</code>} />
            )}
            <Separator className="my-2" />
            <Row
              label="Échéances payées (Kajabi)"
              value={sale.installments_made_kajabi}
            />
            <Row label="Charges réussies" value={sale.payments_succeeded} />
            <Row
              label="Charges échouées"
              value={
                sale.payments_failed > 0 ? (
                  <span className="text-red-600">{sale.payments_failed}</span>
                ) : (
                  0
                )
              }
            />
            <Row label="Refunds" value={sale.refunds_count} />
            {sale.deactivated_at && (
              <>
                <Separator className="my-2" />
                <Row
                  label="Désactivé le"
                  value={
                    <span className="text-amber-600">
                      {formatDateLong(sale.deactivated_at)}
                    </span>
                  }
                />
                <Row
                  label="Motif"
                  value={sale.deactivation_reason ?? "—"}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Historique des paiements ({payments.length})
            </CardTitle>
            <CardDescription>
              Toutes les transactions Kajabi liées à cette vente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun paiement encore enregistré.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>État</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.payment_id}>
                      <TableCell className="text-xs tabular-nums">
                        {p.installment_n ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {formatDate(p.occurred_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.action === "refund" ? (
                          <Badge variant="outline" className="text-purple-700 bg-purple-50">
                            Refund
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {p.action}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <StateBadge state={p.state} />
                      </TableCell>
                      <TableCell className="text-xs">{p.provider}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <span
                          className={
                            p.is_refund
                              ? "text-purple-700"
                              : p.is_failed
                                ? "text-red-500"
                                : ""
                          }
                        >
                          {p.is_refund ? "−" : ""}
                          {formatEurCents(p.amount_cents)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Échéancier prévu ({schedule.length} échéances ·{" "}
              {schedule[0].planned_source === "title"
                ? "depuis le titre"
                : schedule[0].planned_source === "ratio"
                  ? "depuis le ratio offre"
                  : "override manuel"}
              )
            </CardTitle>
            <CardDescription>
              Projection des échéances mensuelles vs paiements réels matchés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date prévue</TableHead>
                  <TableHead className="text-right">Montant prévu</TableHead>
                  <TableHead>Payée le</TableHead>
                  <TableHead className="text-right">Retard</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((s) => (
                  <TableRow key={s.installment_n}>
                    <TableCell className="text-xs tabular-nums">
                      {s.installment_n}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {formatDate(s.expected_at)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEurCents(s.expected_amount_cents)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {s.paid_at ? formatDate(s.paid_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {s.days_late_paid !== null
                        ? `${s.days_late_paid > 0 ? "+" : ""}${s.days_late_paid}j`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StateBadge state={s.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
