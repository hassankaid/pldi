"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { formatDate, formatEur, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = {
  month: string;
  succeeded_count: number;
  refund_count: number;
  gross_collected_eur: number | string;
  refund_amount_eur: number | string | null;
  net_collected_eur: number | string;
  revenue_status: "provisional" | "finalized";
  finalized_at: string;
};

export function RevenueTable({ rows }: { rows: Row[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="border-b border-gold-line">
          <tr className="text-[11px] font-medium text-ink-faint uppercase tracking-wider">
            <th className="px-5 py-2 text-left">Mois</th>
            <th className="px-3 py-2 text-left">Statut</th>
            <th className="px-3 py-2 text-right">Charges</th>
            <th className="px-3 py-2 text-right">Brut encaissé</th>
            <th className="px-3 py-2 text-right">Refunds</th>
            <th className="px-3 py-2 text-right">Net</th>
            <th className="px-3 py-2 text-left">Finalisé le</th>
            <th className="px-5 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {rows.map((m) => {
            const slug = String(m.month).slice(0, 7);
            return (
              <tr
                key={m.month}
                className="hover:bg-surface-2 cursor-pointer transition-colors group"
                onClick={() => router.push(`/revenue/${slug}`)}
              >
                <td className="px-5 py-2.5 font-medium text-ink capitalize">
                  {formatMonthYear(m.month)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                      m.revenue_status === "finalized"
                        ? "bg-info-soft text-info"
                        : "bg-warn-soft text-warn",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        m.revenue_status === "finalized"
                          ? "bg-info"
                          : "bg-warn",
                      )}
                    />
                    {m.revenue_status === "finalized" ? "Finalisé" : "Provisoire"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                  {m.succeeded_count}
                  {m.refund_count > 0 && (
                    <span className="text-refund text-[11px] ml-1">
                      +{m.refund_count}↩
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                  {formatEur(Number(m.gross_collected_eur ?? 0))}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-refund">
                  {m.refund_amount_eur
                    ? `−${formatEur(Number(m.refund_amount_eur))}`
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink whitespace-nowrap">
                  {formatEur(Number(m.net_collected_eur ?? 0))}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-[12px] text-ink-soft">
                  {formatDate(m.finalized_at)}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-ink-soft transition-colors" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
