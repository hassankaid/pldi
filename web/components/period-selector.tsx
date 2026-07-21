"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { PERIOD_PRESETS, type ResolvedPeriod } from "@/lib/period";
import { cn } from "@/lib/utils";

export function PeriodSelector({ current }: { current: ResolvedPeriod }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(current.from);
  const [to, setTo] = useState(current.to);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(preset: string) {
    setOpen(false);
    router.push(`/?preset=${preset}`);
  }
  function applyCustom() {
    if (!from || !to) return;
    setOpen(false);
    router.push(`/?preset=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-gold-line"
      >
        <Calendar className="h-3.5 w-3.5 text-ink-faint" />
        {current.label}
        <ChevronDown className="h-3.5 w-3.5 text-ink-faint" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
          <div className="space-y-0.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => pick(p.key)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors",
                  current.key === p.key
                    ? "bg-gold-soft font-medium text-gold-ink"
                    : "text-ink-soft hover:bg-surface-2 hover:text-ink",
                )}
              >
                {p.label}
                {current.key === p.key && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-line-soft pt-2">
            <div className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              Plage personnalisée
            </div>
            <div className="flex items-center gap-2 px-3">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink focus:border-gold-line focus:outline-none"
              />
              <span className="text-ink-faint">→</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink focus:border-gold-line focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              className="mt-2 w-full rounded-lg bg-gold px-3 py-1.5 text-[13px] font-medium text-[#241C0A] transition-opacity hover:opacity-90"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
