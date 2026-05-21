"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StateBadge } from "@/components/state-badge";
import { formatDate, formatEur } from "@/lib/format";
import type { ImpayeRow } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_FILTER = ["all", "in_retry", "late", "missed"] as const;

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
          <div>
            <div className="font-medium">{row.original.customer_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.customer_email}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "offer_label_snapshot",
        header: "Offre",
        cell: ({ row }) => (
          <div className="max-w-xs truncate text-sm">
            {row.original.offer_label_snapshot ?? "—"}
          </div>
        ),
      },
      {
        id: "installment",
        header: "Échéance",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {row.original.installment_n}/{row.original.plan_total_installments}
          </span>
        ),
      },
      {
        accessorKey: "expected_at",
        header: "Date prévue",
        cell: ({ row }) => (
          <span className="text-xs tabular-nums whitespace-nowrap">
            {formatDate(row.original.expected_at)}
          </span>
        ),
      },
      {
        accessorKey: "days_overdue",
        header: () => <span className="text-right">Retard</span>,
        cell: ({ row }) => {
          const d = row.original.days_overdue;
          return (
            <span
              className={cn(
                "tabular-nums font-medium text-sm",
                d > 60 ? "text-red-600" : d > 21 ? "text-orange-600" : "text-amber-600",
              )}
            >
              {d}j
            </span>
          );
        },
      },
      {
        accessorKey: "expected_eur",
        header: () => <span className="text-right">Montant</span>,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
            {formatEur(Number(row.original.expected_eur))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => <StateBadge state={row.original.status} />,
      },
      {
        accessorKey: "confidence_source",
        header: "Source",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.confidence_source}
          </span>
        ),
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
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Statut :</span>
          {STATUS_FILTER.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter(s)}
            >
              {s === "all"
                ? "Tous"
                : s === "in_retry"
                  ? "Retry"
                  : s === "late"
                    ? "En retard"
                    : "Manqué"}
            </Button>
          ))}
        </div>
      }
    />
  );
}
