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
          <div>
            <div className="font-medium">{row.original.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "total_sales",
        header: () => <span className="text-right">Ventes</span>,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.total_sales}
            <span className="text-xs text-muted-foreground">
              {" "}
              ({row.original.active_sales} act.)
            </span>
          </span>
        ),
      },
      {
        accessorKey: "total_paid_eur",
        header: () => <span className="text-right">Total payé</span>,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
            {formatEur(Number(row.original.total_paid_eur))}
          </span>
        ),
        sortingFn: (a, b) =>
          Number(a.original.total_paid_eur) - Number(b.original.total_paid_eur),
      },
      {
        accessorKey: "impaye_amount_eur_estimated",
        header: () => <span>Impayés</span>,
        cell: ({ row }) =>
          row.original.impaye_count_estimated > 0 ? (
            <span className="text-amber-600 tabular-nums">
              {formatEur(Number(row.original.impaye_amount_eur_estimated))}
              <span className="text-xs ml-1">
                ({row.original.impaye_count_estimated})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "last_payment_at",
        header: "Dernier paiement",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap text-xs">
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
      searchPlaceholder="Rechercher par nom, email, ID client…"
      rowHref={(c) => `/customers/${c.customer_id}`}
      pageSize={50}
    />
  );
}
