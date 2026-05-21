"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StateBadge } from "@/components/state-badge";
import { formatDate, formatEur } from "@/lib/format";
import type { ImpayeRow } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STATUS_FILTER = ["all", "in_retry", "late", "missed"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Tous",
  in_retry: "Retry",
  late: "En retard",
  missed: "Manqué",
};

export function ImpayesTable({ data }: { data: ImpayeRow[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return data.filter((i) =>
      statusFilter === "all" ? true : i.status === statusFilter,
    );
  }, [data, statusFilter]);

  const columns = useMemo<ColumnDef<ImpayeRow>[]>(
    () => [
      {
        id: "customer",
        header: "Client",
        accessorFn: (row) =>
          `${row.customer_name ?? ""} ${row.customer_email ?? ""}`,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-zinc-900 truncate">
              {row.original.customer_name?.trim() || "—"}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {row.original.customer_email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "offer_label_snapshot",
        header: "Offre",
        cell: ({ row }) => (
          <div className="max-w-xs truncate text-zinc-700 text-[12px]">
            {row.original.offer_label_snapshot ?? "—"}
          </div>
        ),
      },
      {
        id: "installment",
        header: "Échéance",
        cell: ({ row }) => (
          <span className="text-zinc-700 tabular-nums text-[12px]">
            <span className="font-medium">{row.original.installment_n}</span>
            <span className="text-zinc-400">
              /{row.original.plan_total_installments}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "expected_at",
        header: "Date prévue",
        cell: ({ row }) => (
          <span className="text-zinc-700 tabular-nums whitespace-nowrap text-[12px]">
            {formatDate(row.original.expected_at)}
          </span>
        ),
      },
      {
        accessorKey: "days_overdue",
        header: "Retard",
        cell: ({ row }) => {
          const d = row.original.days_overdue;
          return (
            <span
              className={cn(
                "tabular-nums font-medium text-[12px]",
                d > 60
                  ? "text-red-600"
                  : d > 21
                    ? "text-orange-600"
                    : "text-amber-600",
              )}
            >
              {d}j
            </span>
          );
        },
      },
      {
        accessorKey: "expected_eur",
        header: "Montant",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-zinc-900 whitespace-nowrap">
            {formatEur(Number(row.original.expected_eur))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StateBadge state={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      data={filtered}
      columns={columns}
      searchKey="customer_email"
      searchPlaceholder="Rechercher par client, email, offre…"
      rowHref={(i) => `/sales/${i.sale_id}`}
      filters={
        <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white p-0.5">
          {STATUS_FILTER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-6 px-2 text-[11px] font-medium rounded transition-colors",
                statusFilter === s
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      }
    />
  );
}
