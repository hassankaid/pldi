export type ResolvedPeriod = {
  from: string;
  to: string;
  label: string;
  key: string;
};

export const PERIOD_PRESETS = [
  { key: "this-month", label: "Ce mois-ci" },
  { key: "last-month", label: "Mois dernier" },
  { key: "this-quarter", label: "Ce trimestre" },
  { key: "ytd", label: "Cette année" },
  { key: "last-12m", label: "12 derniers mois" },
  { key: "all-time", label: "Depuis le début" },
] as const;

const DATA_START = "2021-03-01";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
const frMonth = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const frDate = (s: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${s}T00:00:00`));

/** First day of the month containing `isoDate` (YYYY-MM-01). */
export function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function resolvePeriod(params: {
  preset?: string;
  from?: string;
  to?: string;
}): ResolvedPeriod {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = iso(now);
  const key =
    params.preset ?? (params.from && params.to ? "custom" : "this-month");

  switch (key) {
    case "last-month": {
      const d = new Date(y, m - 1, 1);
      return {
        from: iso(d),
        to: iso(new Date(y, m, 0)),
        label: `${cap(frMonth(d))} ${d.getFullYear()}`,
        key,
      };
    }
    case "this-quarter": {
      const q = Math.floor(m / 3);
      return {
        from: iso(new Date(y, q * 3, 1)),
        to: today,
        label: `T${q + 1} ${y}`,
        key,
      };
    }
    case "ytd":
      return { from: iso(new Date(y, 0, 1)), to: today, label: `${y}`, key };
    case "last-12m":
      return {
        from: iso(new Date(y, m - 11, 1)),
        to: today,
        label: "12 derniers mois",
        key,
      };
    case "all-time":
      return { from: DATA_START, to: today, label: "Depuis le début", key };
    case "custom": {
      const from = params.from || DATA_START;
      const to = params.to || today;
      return { from, to, label: `${frDate(from)} → ${frDate(to)}`, key: "custom" };
    }
    case "this-month":
    default:
      return {
        from: iso(new Date(y, m, 1)),
        to: today,
        label: `${cap(frMonth(now))} ${y}`,
        key: "this-month",
      };
  }
}
