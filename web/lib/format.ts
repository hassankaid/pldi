const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const eurFormatterCompact = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("fr-FR");

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLongFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "long",
});

/** Format cents to "1 234,56 €" */
export function formatEurCents(
  cents: number | string | null | undefined,
): string {
  if (cents === null || cents === undefined) return "—";
  const value = typeof cents === "string" ? Number(cents) : cents;
  if (Number.isNaN(value)) return "—";
  return eurFormatter.format(value / 100);
}

/** Format euros (already in main unit) to "1 234,56 €" */
export function formatEur(
  amount: number | string | null | undefined,
): string {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return eurFormatter.format(value);
}

/** Compact form: "1,2 k €" */
export function formatEurCompact(
  amount: number | string | null | undefined,
): string {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return eurFormatterCompact.format(value);
}

export function formatInteger(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return integerFormatter.format(n);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return dateLongFormatter.format(d);
}

export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return monthYearFormatter.format(d);
}

/** "il y a 3 jours" / "dans 12 jours" */
const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatRelativeDays(days: number | null | undefined): string {
  if (days === null || days === undefined) return "—";
  return rtf.format(days, "day");
}
