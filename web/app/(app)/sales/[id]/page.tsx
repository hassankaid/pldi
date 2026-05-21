import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import {
  getSaleById,
  getPaymentsForSale,
  getScheduleForSale,
} from "@/lib/data/sales";
import {
  formatDate,
  formatDateLong,
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
      <PageHeader
        breadcrumbs={[
          { label: "Ventes", href: "/sales" },
          { label: sale.sale_id.slice(0, 12) + "…" },
        ]}
        title={
          <span className="flex items-center gap-2">
            {sale.offer_label_snapshot ??
              sale.offer_title_public_snapshot ??
              "Vente"}
          </span>
        }
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <PaymentTypeBadge type={sale.payment_type} />
            <StateBadge state={sale.state_business} />
            <span className="font-mono text-[11px] text-zinc-400">
              {sale.sale_id}
            </span>
            <span>·</span>
            <Link
              href={`/customers/${sale.customer_id}`}
              className="font-mono text-[11px] hover:text-zinc-900"
            >
              client {sale.customer_id}
            </Link>
          </span>
        }
        actions={
          <div className="text-right">
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
              Encaissé net
            </div>
            <div className="text-[24px] font-semibold tabular-nums tracking-tight text-zinc-900 leading-none mt-1">
              {formatEurCents(sale.net_collected_cents)}
            </div>
            {sale.refund_cents != null && sale.refund_cents > 0 && (
              <div className="text-[11px] text-violet-600 mt-1">
                dont {formatEurCents(sale.refund_cents)} refunds
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sale info */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-[13px] font-semibold text-zinc-900 mb-4">
            Détails
          </h2>
          <dl className="space-y-2.5 text-[13px]">
            <Row label="Vendue le" value={formatDateLong(sale.sold_at)} />
            <Row
              label="Début effectif"
              value={formatDateLong(sale.effective_start_at)}
            />
            <Row
              label="Par échéance"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {formatEurCents(sale.amount_per_installment_cents)}
                  {sale.amount_source === "observed" ? (
                    <span className="text-[10px] text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded">
                      ✓ observé
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded">
                      ⚠ purchase
                    </span>
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
              <Row label="Coupon" value={<code className="text-xs">{sale.coupon_code}</code>} />
            )}
          </dl>

          <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2.5 text-[13px]">
            <Row
              label="Échéances Kajabi"
              value={sale.installments_made_kajabi}
            />
            <Row label="Charges réussies" value={sale.payments_succeeded} />
            <Row
              label="Charges échouées"
              value={
                <span
                  className={sale.payments_failed > 0 ? "text-red-600" : ""}
                >
                  {sale.payments_failed}
                </span>
              }
            />
            <Row label="Refunds" value={sale.refunds_count} />
          </div>

          {sale.deactivated_at && (
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-2.5 text-[13px]">
              <Row
                label="Désactivé"
                value={
                  <span className="text-amber-600">
                    {formatDateLong(sale.deactivated_at)}
                  </span>
                }
              />
              <Row label="Motif" value={sale.deactivation_reason ?? "—"} />
            </div>
          )}
        </section>

        {/* Payments history */}
        <section className="lg:col-span-2 rounded-xl border border-zinc-200 bg-white">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[13px] font-semibold text-zinc-900">
              Historique des paiements
              <span className="text-zinc-400 font-normal ml-2">
                ({payments.length})
              </span>
            </h2>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Toutes les transactions Kajabi liées à cette vente
            </p>
          </div>

          {payments.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-zinc-400">
              Aucun paiement enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-y border-zinc-100">
                  <tr className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">État</th>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-5 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="px-5 py-2 tabular-nums text-zinc-400 text-[12px]">
                        {p.installment_n ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-700 whitespace-nowrap text-[12px]">
                        {formatDate(p.occurred_at)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 text-[12px]">
                        {p.action === "refund" ? (
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-violet-50 text-violet-700">
                            Refund
                          </span>
                        ) : (
                          <span className="text-[11px]">{p.action}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StateBadge state={p.state} />
                      </td>
                      <td className="px-3 py-2 text-zinc-600 text-[12px]">
                        {p.provider}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        <span
                          className={
                            p.is_refund
                              ? "text-violet-700"
                              : p.is_failed
                                ? "text-zinc-400 line-through"
                                : "text-zinc-900"
                          }
                        >
                          {p.is_refund ? "−" : ""}
                          {formatEurCents(p.amount_cents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Schedule */}
      {schedule.length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-zinc-900">
                Échéancier projeté
                <span className="text-zinc-400 font-normal ml-2">
                  ({schedule.length})
                </span>
              </h2>
              <p className="text-[12px] text-zinc-500 mt-0.5">
                Projection mensuelle vs paiements réels matchés
              </p>
            </div>
            <span className="text-[11px] text-zinc-500">
              Source :{" "}
              <span className="font-medium text-zinc-700">
                {schedule[0].planned_source === "title"
                  ? "internal_title"
                  : schedule[0].planned_source === "ratio"
                    ? "ratio offre"
                    : "override manuel"}
              </span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-y border-zinc-100">
                <tr className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Date prévue</th>
                  <th className="px-3 py-2 text-right">Prévu</th>
                  <th className="px-3 py-2 text-left">Payée le</th>
                  <th className="px-3 py-2 text-right">Retard</th>
                  <th className="px-5 py-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {schedule.map((s) => (
                  <tr key={s.installment_n}>
                    <td className="px-5 py-2 tabular-nums text-zinc-400 text-[12px]">
                      {s.installment_n}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-700 whitespace-nowrap text-[12px]">
                      {formatDate(s.expected_at)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                      {formatEurCents(s.expected_amount_cents)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-600 whitespace-nowrap text-[12px]">
                      {s.paid_at ? formatDate(s.paid_at) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[12px]">
                      {s.days_late_paid !== null ? (
                        <span
                          className={
                            s.days_late_paid > 7
                              ? "text-amber-600"
                              : s.days_late_paid < 0
                                ? "text-emerald-600"
                                : "text-zinc-500"
                          }
                        >
                          {s.days_late_paid > 0 ? "+" : ""}
                          {s.days_late_paid}j
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-2">
                      <StateBadge state={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-zinc-500">{label}</dt>
      <dd className="text-[13px] text-zinc-900 text-right">{value}</dd>
    </div>
  );
}
