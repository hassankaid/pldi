import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getReviewList } from "@/lib/data/review";
import { formatDate, formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const rows = await getReviewList();
  const noCoverage = rows.filter((r) => r.issue_type === "no_coverage");
  const overpayment = rows.filter((r) => r.issue_type === "overpayment");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes à auditer"
        subtitle={`${rows.length} ventes multipay à passer en revue manuellement pour fiabiliser les projections`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SummaryBox
          title="Sans projection"
          subtitle="Pas de matching automatique trouvé"
          count={noCoverage.length}
          totalEur={noCoverage.reduce(
            (s, r) => s + Number(r.total_paid_eur ?? 0),
            0,
          )}
        />
        <SummaryBox
          title="Surpaiements"
          subtitle="Plan probablement plus long que ce qu'on a inféré"
          count={overpayment.length}
          totalEur={overpayment.reduce(
            (s, r) => s + Number(r.total_paid_eur ?? 0),
            0,
          )}
        />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[13px] font-semibold text-zinc-900">
            Ventes à auditer
          </h2>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Triées par montant déjà payé. Cliquez pour voir le détail de la
            vente et confronter au réel. Pour corriger : insérer le vrai
            nombre d'échéances dans la table{" "}
            <code className="text-[11px] bg-zinc-100 text-zinc-700 px-1 py-0.5 rounded">
              app.manual_plan_overrides
            </code>
            .
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="border-y border-zinc-100">
              <tr className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Offre</th>
                <th className="px-3 py-2 text-right">Par éch.</th>
                <th className="px-3 py-2 text-right">Payés</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Vendu</th>
                <th className="px-3 py-2 text-left">Problème</th>
                <th className="px-5 py-2 text-left w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.sale_id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-zinc-900 truncate max-w-[12rem]">
                      {r.customer_name?.trim() || "—"}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate max-w-[12rem]">
                      {r.customer_email}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 max-w-sm truncate text-zinc-700 text-[12px]">
                    {r.offer_internal_title ?? r.offer_public_title ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                    {formatEur(Number(r.amount_per_installment_eur))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                    {r.installments_paid_so_far}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium text-zinc-900 whitespace-nowrap">
                    {formatEur(Number(r.total_paid_eur))}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-600 text-[12px]">
                    {formatDate(r.sold_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        r.issue_type === "no_coverage"
                          ? "bg-zinc-100 text-zinc-600"
                          : "bg-amber-50 text-amber-700",
                      )}
                    >
                      {r.issue_type === "no_coverage"
                        ? "sans projection"
                        : `surpayé (≥${r.estimated_planned_installments})`}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/sales/${r.sale_id}`}
                      className="inline-flex items-center text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryBox({
  title,
  subtitle,
  count,
  totalEur,
}: {
  title: string;
  subtitle: string;
  count: number;
  totalEur: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide">
        {title}
      </div>
      <div className="text-[28px] font-semibold text-zinc-900 tabular-nums leading-none tracking-tight mt-3">
        {count}
      </div>
      <div className="text-[12px] text-zinc-500 mt-2">
        {subtitle} · <span className="text-zinc-700">{formatEur(totalEur)}</span>{" "}
        déjà payés
      </div>
    </div>
  );
}
