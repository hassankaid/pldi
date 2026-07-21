"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import { formatDate, formatEurCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentDetail, ScheduleDetail } from "@/lib/data/monthly";

type Tab = "paid" | "failed" | "refund" | "upcoming";

export function MonthDrilldown({
  paid,
  failed,
  refunds,
  upcoming,
  caBrutEur,
  refundEur,
}: {
  paid: PaymentDetail[];
  failed: PaymentDetail[];
  refunds: PaymentDetail[];
  upcoming: ScheduleDetail[];
  caBrutEur: number;
  refundEur: number;
}) {
  const [tab, setTab] = useState<Tab>("paid");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "paid", label: "Mensualités payées", count: paid.length },
    { key: "failed", label: "Échecs", count: failed.length },
    { key: "refund", label: "Remboursements", count: refunds.length },
    { key: "upcoming", label: "À venir / en retard", count: upcoming.length },
  ];

  return (
    <section className="rounded-xl border border-line bg-surface overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 pt-3 border-b border-line-soft overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors -mb-px border-b-2",
              tab === t.key
                ? "border-gold text-gold-ink"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] text-ink-faint tabular-nums">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "paid" && (
        <PaidTable rows={paid} totalEur={caBrutEur} />
      )}
      {tab === "failed" && <FailedTable rows={failed} />}
      {tab === "refund" && <RefundTable rows={refunds} totalEur={refundEur} />}
      {tab === "upcoming" && <UpcomingTable rows={upcoming} />}
    </section>
  );
}

function THead({ cols }: { cols: { label: string; align?: "right" }[] }) {
  return (
    <thead className="border-b border-gold-line">
      <tr className="text-[11px] font-medium text-ink-faint uppercase tracking-wider">
        {cols.map((c, i) => (
          <th
            key={i}
            className={cn(
              "px-4 py-2",
              c.align === "right" ? "text-right" : "text-left",
            )}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function CustomerCell({
  id,
  name,
  email,
}: {
  id: string;
  name: string | null;
  email: string | null;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-left min-w-0 hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/customers/${id}`);
      }}
    >
      <div className="font-medium text-ink truncate">{name?.trim() || "—"}</div>
      <div className="text-[11px] text-ink-soft truncate">{email}</div>
    </button>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-[13px] text-ink-faint">
      {message}
    </div>
  );
}

function PaidTable({ rows, totalEur }: { rows: PaymentDetail[]; totalEur: number }) {
  const router = useRouter();
  if (rows.length === 0) return <Empty message="Aucune mensualité payée ce mois." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <THead
          cols={[
            { label: "Date" },
            { label: "Client" },
            { label: "Offre" },
            { label: "Type" },
            { label: "Éch." },
            { label: "Provider" },
            { label: "Montant", align: "right" },
          ]}
        />
        <tbody className="divide-y divide-line-soft">
          {rows.map((p) => (
            <tr
              key={p.payment_id}
              className="hover:bg-surface-2 cursor-pointer transition-colors"
              onClick={() => router.push(`/sales/${p.sale_id}`)}
            >
              <td className="px-4 py-2.5 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                {formatDate(p.occurred_at)}
              </td>
              <td className="px-4 py-2.5">
                <CustomerCell id={p.customer_id} name={p.customer_name} email={p.customer_email} />
              </td>
              <td className="px-4 py-2.5 max-w-xs truncate text-ink-soft">
                {p.offer_label_snapshot ?? "—"}
              </td>
              <td className="px-4 py-2.5">
                <PaymentTypeBadge type={p.payment_type} />
              </td>
              <td className="px-4 py-2.5 tabular-nums text-ink-soft text-[12px]">
                {p.installment_n ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-ink-soft text-[12px]">{p.provider}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-ink whitespace-nowrap">
                {formatEurCents(p.amount_cents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line bg-surface-2">
          <tr>
            <td colSpan={6} className="px-4 py-2.5 text-[12px] text-ink-soft text-right">
              Total encaissé brut
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">
              {formatEurCents(Math.round(totalEur * 100))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FailedTable({ rows }: { rows: PaymentDetail[] }) {
  const router = useRouter();
  if (rows.length === 0)
    return <Empty message="Aucun échec de paiement ce mois 🎉" />;
  return (
    <>
      <div className="px-4 py-2.5 bg-crit-soft border-b border-line-soft text-[12px] text-ink-soft">
        Charges refusées ce mois — relançables depuis la fiche client. Le
        montant indiqué est <strong>tenté</strong>, pas encaissé.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <THead
            cols={[
              { label: "Date" },
              { label: "Client" },
              { label: "Offre" },
              { label: "Provider" },
              { label: "Montant tenté", align: "right" },
              { label: "État", align: "right" },
            ]}
          />
          <tbody className="divide-y divide-line-soft">
            {rows.map((p) => (
              <tr
                key={p.payment_id}
                className="hover:bg-surface-2 cursor-pointer transition-colors"
                onClick={() => router.push(`/sales/${p.sale_id}`)}
              >
                <td className="px-4 py-2.5 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                  {formatDate(p.occurred_at)}
                </td>
                <td className="px-4 py-2.5">
                  <CustomerCell id={p.customer_id} name={p.customer_name} email={p.customer_email} />
                </td>
                <td className="px-4 py-2.5 max-w-xs truncate text-ink-soft">
                  {p.offer_label_snapshot ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-ink-soft text-[12px]">{p.provider}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint line-through whitespace-nowrap">
                  {formatEurCents(p.amount_cents)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <StateBadge state="failed" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-line-soft">
        <Link
          href="/impayes"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-gold-ink hover:text-gold-ink"
        >
          Voir tous les impayés
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </>
  );
}

function RefundTable({ rows, totalEur }: { rows: PaymentDetail[]; totalEur: number }) {
  const router = useRouter();
  if (rows.length === 0)
    return <Empty message="Aucun remboursement ce mois." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <THead
          cols={[
            { label: "Date" },
            { label: "Client" },
            { label: "Offre" },
            { label: "Provider" },
            { label: "Montant remboursé", align: "right" },
          ]}
        />
        <tbody className="divide-y divide-line-soft">
          {rows.map((p) => (
            <tr
              key={p.payment_id}
              className="hover:bg-surface-2 cursor-pointer transition-colors"
              onClick={() => router.push(`/sales/${p.sale_id}`)}
            >
              <td className="px-4 py-2.5 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                {formatDate(p.occurred_at)}
              </td>
              <td className="px-4 py-2.5">
                <CustomerCell id={p.customer_id} name={p.customer_name} email={p.customer_email} />
              </td>
              <td className="px-4 py-2.5 max-w-xs truncate text-ink-soft">
                {p.offer_label_snapshot ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-ink-soft text-[12px]">{p.provider}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium text-refund whitespace-nowrap">
                −{formatEurCents(p.amount_cents)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-line bg-surface-2">
          <tr>
            <td colSpan={4} className="px-4 py-2.5 text-[12px] text-ink-soft text-right">
              Total remboursé
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-refund">
              −{formatEurCents(Math.round(totalEur * 100))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function UpcomingTable({ rows }: { rows: ScheduleDetail[] }) {
  const router = useRouter();
  // late/missed first (overdue), then scheduled by date
  const sorted = [...rows].sort((a, b) => {
    const overdue = (s: string) => (s === "scheduled" ? 1 : 0);
    if (overdue(a.status) !== overdue(b.status))
      return overdue(a.status) - overdue(b.status);
    return a.expected_at.localeCompare(b.expected_at);
  });
  if (rows.length === 0)
    return <Empty message="Aucune échéance projetée ce mois." />;
  return (
    <>
      <div className="px-4 py-2.5 bg-warn-soft border-b border-line-soft text-[12px] text-ink-soft">
        ⚡ Projection d'après l'échéancier multipay (couverture ~63%) — non
        encaissé, peut varier. Les abonnements ne sont pas inclus.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <THead
            cols={[
              { label: "Date prévue" },
              { label: "Client" },
              { label: "Offre" },
              { label: "Éch." },
              { label: "Montant prévu", align: "right" },
              { label: "Retard", align: "right" },
              { label: "Statut", align: "right" },
            ]}
          />
          <tbody className="divide-y divide-line-soft">
            {sorted.map((s, i) => {
              const overdueDays =
                s.days_until_expected != null ? -s.days_until_expected : null;
              return (
                <tr
                  key={`${s.sale_id}-${s.installment_n}-${i}`}
                  className="hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => router.push(`/sales/${s.sale_id}`)}
                >
                  <td className="px-4 py-2.5 tabular-nums text-ink-soft whitespace-nowrap text-[12px]">
                    {formatDate(s.expected_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <CustomerCell
                      id={s.customer_id ?? ""}
                      name={s.customer_name}
                      email={s.customer_email}
                    />
                  </td>
                  <td className="px-4 py-2.5 max-w-xs truncate text-ink-soft">
                    {s.offer_label_snapshot ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-soft text-[12px]">
                    {s.installment_n}/{s.planned_installments}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft whitespace-nowrap">
                    {formatEurCents(s.expected_amount_cents)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-[12px]">
                    {overdueDays != null && overdueDays > 0 ? (
                      <span
                        className={cn(
                          overdueDays > 60
                            ? "text-crit"
                            : overdueDays > 21
                              ? "text-warn"
                              : "text-warn",
                        )}
                      >
                        +{overdueDays}j
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <StateBadge state={s.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
