"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { formatDate, formatEur } from "@/lib/format";
import type { CustomerSummary } from "@/lib/data/types";

export function CustomersTable({ data }: { data: CustomerSummary[] }) {
  const columns = useMemo<ColumnDef<CustomerSummary>[]>(
    () => [
      {
        id: "client",
        header: "Client",
        accessorFn: (row) =>
          `${row.name ?? ""} ${row.email ?? ""} ${row.customer_id}`,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-zinc-900 truncate">
              {row.original.name?.trim() || "—"}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "total_sales",
        header: "Ventes",
        cell: ({ row }) => (
          <span className="tabular-nums text-zinc-700">
            {row.original.total_sales}
            <span className="text-[11px] text-zinc-400 ml-1">
              ({row.original.active_sales} act.)
            </span>
          </span>
        ),
      },
      {
        accessorKey: "total_paid_eur",
        header: "Total payé",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-zinc-900 whitespace-nowrap">
            {formatEur(Number(row.original.total_paid_eur))}
          </span>
        ),
        sortingFn: (a, b) =>
          Number(a.original.total_paid_eur) - Number(b.original.total_paid_eur),
      },
      {
        accessorKey: "impaye_amount_eur_estimated",
        header: "Impayés",
        cell: ({ row }) =>
          row.original.impaye_count_estimated > 0 ? (
            <span className="text-amber-600 tabular-nums whitespace-nowrap">
              {formatEur(Number(row.original.impaye_amount_eur_estimated))}
              <span className="text-[11px] ml-1 text-amber-500">
                ({row.original.impaye_count_estimated})
              </span>
            </span>
          ) : (
            <span className="text-zinc-300">—</span>
          ),
      },
      {
        accessorKey: "last_payment_at",
        header: "Dernier paiement",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap text-zinc-600 text-[12px]">
            {formatDate(row.original.last_payment_at)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={data}
      columns={columns}
      searchKey="customer_id"
      searchPlaceholder="Rechercher par nom, email, ID…"
      rowHref={(c) => `/customers/${c.customer_id}`}
      pageSize={50}
    />
  );
}
