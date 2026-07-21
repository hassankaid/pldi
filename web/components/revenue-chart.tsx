"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur, formatEurCompact, formatMonthYear } from "@/lib/format";

type Row = {
  month: string;
  net_collected_eur: number | string;
  succeeded_count: number;
  refund_count: number;
  revenue_status: "provisional" | "finalized";
};

export function RevenueChart({ data }: { data: Row[] }) {
  const formatted = data.map((d) => ({
    ...d,
    monthLabel: formatMonthYear(d.month),
    monthShort: shortMonth(d.month),
    net: Number(d.net_collected_eur ?? 0),
  }));

  return (
    <div className="space-y-3">
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart
            data={formatted}
            margin={{ top: 16, right: 8, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="0"
              stroke="var(--line)"
              vertical={false}
            />
            <XAxis
              dataKey="monthShort"
              tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              tickFormatter={(v: number) => formatEurCompact(v)}
              tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              cursor={{ fill: "rgba(201, 168, 76, 0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as (typeof formatted)[number];
                return (
                  <div className="rounded-lg border border-line bg-surface shadow-sm p-3 text-[12px]">
                    <div className="font-medium text-ink capitalize mb-1.5">
                      {d.monthLabel}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-ink-soft">CA net</span>
                        <span className="font-semibold tabular-nums text-ink">
                          {formatEur(d.net)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-ink-soft">Charges</span>
                        <span className="tabular-nums text-ink">
                          {d.succeeded_count}
                          {d.refund_count > 0 &&
                            ` (+${d.refund_count} refund)`}
                        </span>
                      </div>
                      <div className="pt-1 mt-1 border-t border-line-soft">
                        <span
                          className={
                            d.revenue_status === "finalized"
                              ? "text-pos text-[11px]"
                              : "text-warn text-[11px]"
                          }
                        >
                          {d.revenue_status === "finalized"
                            ? "Finalisé"
                            : "Provisoire"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="net" name="CA net" radius={[4, 4, 0, 0]}>
              {formatted.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.revenue_status === "provisional"
                      ? "var(--warn)"
                      : "var(--gold)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-gold" />
          Finalisé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-warn" />
          Provisoire <span className="text-ink-faint">(jusqu'à M+1+21j)</span>
        </span>
      </div>
    </div>
  );
}

function shortMonth(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
