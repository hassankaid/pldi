"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { StateBadge, PaymentTypeBadge } from "@/components/state-badge";
import { formatDate, formatEurCents } from "@/lib/format";
import type { Sale } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
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
          <span className="tabular-nums whitespace-nowrap">
            {formatDate(row.original.sold_at)}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Client",
        accessorFn: (row) => row.customer_id,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.customer_id}</span>
        ),
      },
      {
        accessorKey: "offer_label_snapshot",
        header: "Offre",
        cell: ({ row }) => (
          <div className="max-w-md truncate">
            <div>{row.original.offer_label_snapshot ?? "—"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {row.original.offer_title_public_snapshot}
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
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.payments_succeeded}
            {row.original.payments_failed > 0 && (
              <span className="text-red-500 text-xs">
                {" "}
                / {row.original.payments_failed} échec
              </span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "amount_per_installment_cents",
        header: () => <span>Par échéance</span>,
        cell: ({ row }) => (
          <span className="tabular-nums whitespace-nowrap">
            {formatEurCents(row.original.amount_per_installment_cents)}
            {row.original.amount_source === "purchase_fallback" && (
              <span className="ml-1 text-xs text-amber-600" title="Fallback purchase">⚠</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "net_collected_cents",
        header: () => <span className="text-right">Encaissé net</span>,
        cell: ({ row }) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
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
        <div className="flex flex-wrap gap-2">
          <FilterGroup
            label="État"
            value={stateFilter}
            options={STATE_ORDER}
            onChange={setStateFilter}
          />
          <FilterGroup
            label="Type"
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
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label} :</span>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <Button
            key={o}
            variant={value === o ? "default" : "outline"}
            size="sm"
            className={cn("h-7 text-xs px-2.5", value === o && "shadow-none")}
            onClick={() => onChange(o)}
          >
            {LABELS[o] ?? o}
          </Button>
        ))}
      </div>
    </div>
  );
}
