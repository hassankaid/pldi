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
    net: Number(d.net_collected_eur ?? 0),
  }));

  return (
    <div className="space-y-3">
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <BarChart
            data={formatted}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatEurCompact(v)}
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value) => [formatEur(Number(value)), "CA net"]}
              labelStyle={{ color: "var(--foreground)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="net" name="CA net" radius={[4, 4, 0, 0]}>
              {formatted.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.revenue_status === "provisional" ? "#fbbf24" : "#0ea5e9"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-sky-500" />
          Finalisé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-400" />
          Provisoire (M+1 + 21 jours)
        </span>
      </div>
    </div>
  );
}
