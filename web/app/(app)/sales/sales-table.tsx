"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import { formatDate, formatEurCents } from "@/lib/format";
import type { Sale } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const STATE_ORDER = ["all", "active", "completed", "canceled", "refunded", "defaulted"] as const;
const TYPE_ORDER = ["all", "multipay", "single", "subscription", "free"] as const;

export function SalesTable({ data }: { data: Sale[] }) {
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (stateFilter !== "all" && s.state_business !== stateFilter) return false;
      if (typeFilter !== "all" && s.payment_type !== typeFilter) return false;
      return true;
    });
  }, [data, stateFilter, typeFilter]);

  const columns = useMemo<ColumnDef<Sale>[]>(
    () => [
      {
        accessorKey: "sold_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap text-zinc-600">
            {formatDate(row.original.sold_at)}
          </span>
        ),
      },
      {
        accessorKey: "offer_label_snapshot",
        header: "Offre",
        cell: ({ row }) => (
          <div className="max-w-md min-w-0">
            <div className="font-medium text-zinc-900 truncate">
              {row.original.offer_label_snapshot ?? "—"}
            </div>
            <div className="text-[11px] text-zinc-500 truncate font-mono">
              {row.original.customer_id}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "payment_type",
        header: "Type",
        cell: ({ row }) => <PaymentTypeBadge type={row.original.payment_type} />,
      },
      {
        id: "progress",
        header: "Avancement",
        cell: ({ row }) => {
          const s = row.original;
          return (
            <span className="text-zinc-700 tabular-nums whitespace-nowrap">
              {s.payments_succeeded}
              {s.payments_failed > 0 && (
                <span className="text-red-500 text-[11px] ml-0.5">
                  /{s.payments_failed}❌
                </span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "amount_per_installment_cents",
        header: "Par échéance",
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap text-zinc-700">
            {formatEurCents(row.original.amount_per_installment_cents)}
            {row.original.amount_source === "purchase_fallback" && (
              <span
                className="ml-1 text-amber-500 text-[11px]"
                title="Inféré depuis purchase (peut être imprécis)"
              >
                ⚠
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "net_collected_cents",
        header: "Encaissé net",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-zinc-900 whitespace-nowrap">
            {formatEurCents(row.original.net_collected_cents)}
          </span>
        ),
      },
      {
        accessorKey: "state_business",
        header: "État",
        cell: ({ row }) => <StateBadge state={row.original.state_business} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      data={filtered}
      columns={columns}
      searchKey="customer_id"
      searchPlaceholder="Rechercher par client, offre, sale_id…"
      rowHref={(s) => `/sales/${s.sale_id}`}
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <FilterGroup
            value={stateFilter}
            options={STATE_ORDER}
            onChange={setStateFilter}
          />
          <FilterGroup
            value={typeFilter}
            options={TYPE_ORDER}
            onChange={setTypeFilter}
          />
        </div>
      }
    />
  );
}

const LABELS: Record<string, string> = {
  all: "Tous",
  active: "Actifs",
  completed: "Complétés",
  canceled: "Annulés",
  refunded: "Remboursés",
  defaulted: "En défaut",
  multipay: "Plans",
  single: "One-shot",
  subscription: "Abonnements",
  free: "Gratuits",
};

function FilterGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-zinc-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-6 px-2 text-[11px] font-medium rounded transition-colors",
            value === o
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:text-zinc-900",
          )}
        >
          {LABELS[o] ?? o}
        </button>
      ))}
    </div>
  );
}
