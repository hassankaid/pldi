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
            <span className="font-mono text-[11px] text-ink-faint">
              {sale.sale_id}
            </span>
            <span>·</span>
            <Link
              href={`/customers/${sale.customer_id}`}
              className="font-mono text-[11px] hover:text-gold-ink"
            >
              client {sale.customer_id}
            </Link>
          </span>
        }
        actions={
          <div className="text-right">
            <div className="text-[11px] text-ink-soft uppercase tracking-wider">
              Encaissé net
            </div>
            <div className="text-[24px] font-semibold tabular-nums tracking-tight text-ink leading-none mt-1">
              {formatEurCents(sale.net_collected_cents)}
            </div>
            {sale.refund_cents != null && sale.refund_cents > 0 && (
              <div className="text-[11px] text-refund mt-1">
                dont {formatEurCents(sale.refund_cents)} refunds
              </div>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sale info */}
        <section className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[13px] font-semibold text-ink mb-4">
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
                    <span className="text-[10px] text-pos px-1.5 py-0.5 bg-pos-soft rounded">
                      ✓ observé
                    </span>
                  ) : (
                    <span className="text-[10px] text-warn px-1.5 py-0.5 bg-warn-soft rounded">
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
                    <span className="text-warn">
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

          <div className="mt-4 pt-4 border-t border-line-soft space-y-2.5 text-[13px]">
            <Row
              label="Échéances Kajabi"
              value={sale.installments_made_kajabi}
            />
            <Row label="Charges réussies" value={sale.payments_succeeded} />
            <Row
              label="Charges échouées"
              value={
                <span
                  className={sale.payments_failed > 0 ? "text-crit" : ""}
                >
                  {sale.payments_failed}
                </span>
              }
            />
            <Row label="Refunds" value={sale.refunds_count} />
          </div>

          {sale.deactivated_at && (
            <div className="mt-4 pt-4 border-t border-line-soft space-y-2.5 text-[13px]">
              <Row
                label="Désactivé"
                value={
                  <span className="text-warn">
                    {formatDateLong(sale.deactivated_at)}
                  </span>
                }
              />
              <Row label="Motif" value={sale.deactivation_reason ?? "—"} />
            </div>
          )}
        </section>

        {/* Payments history */}
        <section className="lg:col-span-2 rounded-xl border border-line bg-surface">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[13px] font-semibold text-ink">
              Historique des paiements
              <span className="text-ink-faint font-normal ml-2">
                ({payments.length})
              </span>
            </h2>
            <p className="text-[12px] text-ink-soft mt-0.5">
              Toutes les transactions Kajabi liées à cette vente
            </p>
          </div>

          {payments.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-ink-faint">
              Aucun paiement enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="border-b border-gold-line">
                  <tr className="text-[11px] font-medium text-ink-faint uppercase tracking-wider">
                    <th className="px-5 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-left">État</th>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-5 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {payments.map((p) => (
                    <tr key={p.payment_id} className="hover:bg-surface-2">
                      <td className="px-5 py-2 tabular-nums text-ink-faint text-[12px]">
                        {p.installment_n ?? "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                        {formatDate(p.occurred_at)}
                      </td>
                      <td className="px-3 py-2 text-ink-soft text-[12px]">
                        {p.action === "refund" ? (
                          <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-refund-soft text-refund">
                            Refund
                          </span>
                        ) : (
                          <span className="text-[11px]">{p.action}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <StateBadge state={p.state} />
                      </td>
                      <td className="px-3 py-2 text-ink-soft text-[12px]">
                        {p.provider}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums font-medium whitespace-nowrap">
                        <span
                          className={
                            p.is_refund
                              ? "text-refund"
                              : p.is_failed
                                ? "text-ink-faint line-through"
                                : "text-ink"
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
        <section className="rounded-xl border border-line bg-surface">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold text-ink">
                Échéancier projeté
                <span className="text-ink-faint font-normal ml-2">
                  ({schedule.length})
                </span>
              </h2>
              <p className="text-[12px] text-ink-soft mt-0.5">
                Projection mensuelle vs paiements réels matchés
              </p>
            </div>
            <span className="text-[11px] text-ink-soft">
              Source :{" "}
              <span className="font-medium text-ink">
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
              <thead className="border-b border-gold-line">
                <tr className="text-[11px] font-medium text-ink-faint uppercase tracking-wider">
                  <th className="px-5 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Date prévue</th>
                  <th className="px-3 py-2 text-right">Prévu</th>
                  <th className="px-3 py-2 text-left">Payée le</th>
                  <th className="px-3 py-2 text-right">Retard</th>
                  <th className="px-5 py-2 text-left">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {schedule.map((s) => (
                  <tr key={s.installment_n} className="hover:bg-surface-2">
                    <td className="px-5 py-2 tabular-nums text-ink-faint text-[12px]">
                      {s.installment_n}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                      {formatDate(s.expected_at)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">
                      {formatEurCents(s.expected_amount_cents)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                      {s.paid_at ? formatDate(s.paid_at) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[12px]">
                      {s.days_late_paid !== null ? (
                        <span
                          className={
                            s.days_late_paid > 7
                              ? "text-warn"
                              : s.days_late_paid < 0
                                ? "text-pos"
                                : "text-ink-soft"
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
      <dt className="text-[12px] text-ink-soft">{label}</dt>
      <dd className="text-[13px] text-ink text-right">{value}</dd>
    </div>
  );
}
