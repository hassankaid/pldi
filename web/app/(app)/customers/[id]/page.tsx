import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
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
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import { getCustomerInfo, getSalesForCustomer } from "@/lib/data/sales";
import {
  formatDate,
  formatDateLong,
  formatEur,
  formatEurCents,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [customer, sales] = await Promise.all([
    getCustomerInfo(id),
    getSalesForCustomer(id),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour aux clients
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.name ?? "—"}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
            {customer.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {customer.email}
              </span>
            )}
            {customer.phone_number && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                {customer.phone_number}
              </span>
            )}
            {customer.address_country && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {customer.address_country}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Customer&nbsp;ID : <span className="font-mono">{customer.customer_id}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Total payé</div>
          <div className="text-2xl font-bold tabular-nums">
            {formatEur(Number(customer.total_paid_eur))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            sur {customer.total_successful_charges} charge
            {customer.total_successful_charges > 1 ? "s" : ""} réussie
            {customer.total_successful_charges > 1 ? "s" : ""}
          </div>
        </div>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Ventes totales" value={customer.total_sales} />
        <Stat
          label="Actives"
          value={customer.active_sales}
          tone={customer.active_sales > 0 ? "good" : undefined}
        />
        <Stat label="Complétées" value={customer.completed_sales} />
        <Stat
          label="Annulées"
          value={customer.canceled_sales}
          tone={customer.canceled_sales > 0 ? "muted" : undefined}
        />
        <Stat
          label="Remboursées"
          value={customer.refunded_sales}
          tone={customer.refunded_sales > 0 ? "warn" : undefined}
        />
        <Stat
          label="Impayés estimés"
          value={
            customer.impaye_count_estimated > 0
              ? `${customer.impaye_count_estimated} (${formatEur(
                  Number(customer.impaye_amount_eur_estimated),
                )})`
              : "0"
          }
          tone={customer.impaye_count_estimated > 0 ? "warn" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historique des ventes ({sales.length})
          </CardTitle>
          <CardDescription>
            Premier achat le {formatDateLong(customer.first_sale_at)} · dernier
            le {formatDateLong(customer.last_sale_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="text-right">Échéance</TableHead>
                <TableHead className="text-right">Encaissé</TableHead>
                <TableHead>Avancement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow
                  key={s.sale_id}
                  className="cursor-pointer hover:bg-muted/30"
                >
                  <TableCell className="text-xs tabular-nums whitespace-nowrap">
                    <Link href={`/sales/${s.sale_id}`} className="block">
                      {formatDate(s.sold_at)}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    <Link href={`/sales/${s.sale_id}`} className="block">
                      {s.offer_label_snapshot ??
                        s.offer_title_public_snapshot ??
                        "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <PaymentTypeBadge type={s.payment_type} />
                  </TableCell>
                  <TableCell>
                    <StateBadge state={s.state_business} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatEurCents(s.amount_per_installment_cents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatEurCents(s.net_collected_cents)}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {s.payments_succeeded}
                    {s.payments_failed > 0 && (
                      <span className="text-red-500">
                        {" "}
                        / {s.payments_failed}❌
                      </span>
                    )}
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn" | "muted";
}) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground truncate">{label}</div>
      <div
        className={
          tone === "good"
            ? "text-lg font-semibold text-emerald-600 tabular-nums"
            : tone === "warn"
              ? "text-lg font-semibold text-amber-600 tabular-nums"
              : tone === "muted"
                ? "text-lg font-semibold text-muted-foreground tabular-nums"
                : "text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </div>
    </Card>
  );
}
