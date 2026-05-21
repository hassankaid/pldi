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
              stroke="#f4f4f5"
              vertical={false}
            />
            <XAxis
              dataKey="monthShort"
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              dy={4}
            />
            <YAxis
              tickFormatter={(v: number) => formatEurCompact(v)}
              tick={{ fontSize: 11, fill: "#71717a" }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as (typeof formatted)[number];
                return (
                  <div className="rounded-lg border border-zinc-200 bg-white shadow-sm p-3 text-[12px]">
                    <div className="font-medium text-zinc-900 capitalize mb-1.5">
                      {d.monthLabel}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">CA net</span>
                        <span className="font-semibold tabular-nums text-zinc-900">
                          {formatEur(d.net)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-zinc-500">Charges</span>
                        <span className="tabular-nums text-zinc-700">
                          {d.succeeded_count}
                          {d.refund_count > 0 &&
                            ` (+${d.refund_count} refund)`}
                        </span>
                      </div>
                      <div className="pt-1 mt-1 border-t border-zinc-100">
                        <span
                          className={
                            d.revenue_status === "finalized"
                              ? "text-emerald-700 text-[11px]"
                              : "text-amber-700 text-[11px]"
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
                    d.revenue_status === "provisional" ? "#fbbf24" : "#6366f1"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-indigo-500" />
          Finalisé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-400" />
          Provisoire <span className="text-zinc-400">(jusqu'à M+1+21j)</span>
        </span>
      </div>
    </div>
  );
}

function shortMonth(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
