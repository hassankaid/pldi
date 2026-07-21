import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import { PunctualityBanner } from "@/components/customer-punctuality";
import { PaymentTimeline } from "@/components/payment-timeline";
import { getCustomerInfo, getSalesForCustomer } from "@/lib/data/sales";
import {
  getCustomerPunctuality,
  getCustomerTimeline,
} from "@/lib/data/customer";
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

  const [customer, sales, punctuality, timeline] = await Promise.all([
    getCustomerInfo(id),
    getSalesForCustomer(id),
    getCustomerPunctuality(id),
    getCustomerTimeline(id),
  ]);

  if (!customer) {
    notFound();
  }

  const initial = (customer.name ?? customer.email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Clients", href: "/customers" },
          { label: customer.name ?? customer.email ?? customer.customer_id },
        ]}
        title={
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold to-[#8f6f22] flex items-center justify-center text-[#1b1710] text-sm font-semibold shrink-0">
              {initial}
            </div>
            <span>{customer.name?.trim() || "Client sans nom"}</span>
          </div>
        }
        subtitle={
          <div className="flex flex-wrap items-center gap-3 text-[12px] mt-2 ml-12">
            {customer.email && (
              <span className="inline-flex items-center gap-1 text-ink-soft">
                <Mail className="h-3 w-3" />
                {customer.email}
              </span>
            )}
            {customer.phone_number && (
              <span className="inline-flex items-center gap-1 text-ink-soft">
                <Phone className="h-3 w-3" />
                {customer.phone_number}
              </span>
            )}
            {customer.address_country && (
              <span className="inline-flex items-center gap-1 text-ink-soft">
                <MapPin className="h-3 w-3" />
                {customer.address_country}
              </span>
            )}
            <span className="font-mono text-[11px] text-ink-faint">
              {customer.customer_id}
            </span>
          </div>
        }
        actions={
          <div className="text-right">
            <div className="text-[11px] text-ink-faint uppercase tracking-wider">
              Total payé
            </div>
            <div className="text-[24px] font-semibold tabular-nums tracking-tight text-ink leading-none mt-1">
              {formatEur(Number(customer.total_paid_eur))}
            </div>
            <div className="text-[11px] text-ink-soft mt-1">
              {customer.total_successful_charges} charges réussies
            </div>
          </div>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
          label="Impayés"
          value={
            customer.impaye_count_estimated > 0
              ? `${customer.impaye_count_estimated}`
              : "0"
          }
          subtitle={
            customer.impaye_count_estimated > 0
              ? formatEur(Number(customer.impaye_amount_eur_estimated))
              : undefined
          }
          tone={customer.impaye_count_estimated > 0 ? "warn" : undefined}
        />
      </div>

      {/* Ponctualité (estimé, multipay couvert) */}
      <PunctualityBanner data={punctuality} />

      {/* Sales history */}
      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-ink">
            Historique des ventes
            <span className="text-ink-faint font-normal ml-2">
              ({sales.length})
            </span>
          </h2>
          <p className="text-[12px] text-ink-soft mt-0.5">
            Premier achat {formatDateLong(customer.first_sale_at)} · dernier{" "}
            {formatDateLong(customer.last_sale_at)}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-b border-gold-line">
              <tr className="text-[11px] font-medium text-ink-faint uppercase tracking-wider">
                <th className="px-5 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Offre</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">État</th>
                <th className="px-3 py-2 text-right">Échéance</th>
                <th className="px-3 py-2 text-right">Encaissé</th>
                <th className="px-5 py-2 text-left">Avancement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {sales.map((s) => (
                <tr
                  key={s.sale_id}
                  className="hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-2 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                    <Link href={`/sales/${s.sale_id}`} className="block">
                      {formatDate(s.sold_at)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 max-w-md truncate text-ink">
                    <Link href={`/sales/${s.sale_id}`} className="block">
                      {s.offer_label_snapshot ??
                        s.offer_title_public_snapshot ??
                        "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <PaymentTypeBadge type={s.payment_type} />
                  </td>
                  <td className="px-3 py-2">
                    <StateBadge state={s.state_business} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-soft">
                    {formatEurCents(s.amount_per_installment_cents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-ink whitespace-nowrap">
                    {formatEurCents(s.net_collected_cents)}
                  </td>
                  <td className="px-5 py-2 tabular-nums text-[12px]">
                    {s.payments_succeeded}
                    {s.payments_failed > 0 && (
                      <span className="text-crit text-[11px] ml-0.5">
                        /{s.payments_failed}❌
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Timeline chronologique */}
      <PaymentTimeline events={timeline} />
    </div>
  );
}

function Stat({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: number | string;
  subtitle?: string;
  tone?: "good" | "warn" | "muted";
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[11px] text-ink-faint uppercase tracking-wide truncate">
        {label}
      </div>
      <div
        className={
          tone === "good"
            ? "text-[20px] font-semibold text-pos tabular-nums mt-1"
            : tone === "warn"
              ? "text-[20px] font-semibold text-warn tabular-nums mt-1"
              : tone === "muted"
                ? "text-[20px] font-semibold text-ink-faint tabular-nums mt-1"
                : "text-[20px] font-semibold text-ink tabular-nums mt-1"
        }
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-[11px] text-ink-soft mt-0.5 tabular-nums">
          {subtitle}
        </div>
      )}
    </div>
  );
}
