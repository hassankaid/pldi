import { PageHeader } from "@/components/page-header";
import { getAllImpayes } from "@/lib/data/impayes";
import { ImpayesTable } from "./impayes-table";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImpayesPage() {
  const impayes = await getAllImpayes();

  const totalActionable = impayes
    .filter((i) => i.status === "in_retry" || i.status === "late")
    .reduce((sum, i) => sum + Number(i.expected_eur), 0);
  const countActionable = impayes.filter(
    (i) => i.status === "in_retry" || i.status === "late",
  ).length;

  const totalMissed = impayes
    .filter((i) => i.status === "missed")
    .reduce((sum, i) => sum + Number(i.expected_eur), 0);
  const countMissed = impayes.filter((i) => i.status === "missed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impayés"
        subtitle={`${impayes.length} échéances détectées · couverture estimée 63 % des plans multipay`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryBox
          title="À relancer maintenant"
          subtitle="in_retry + late (0–21 jours)"
          eur={totalActionable}
          count={countActionable}
          tone="warn"
        />
        <SummaryBox
          title="Manqués (&gt;21 j)"
          subtitle="Plans probablement perdus"
          eur={totalMissed}
          count={countMissed}
          tone="danger"
        />
        <SummaryBox
          title="Total détecté"
          subtitle="Sur les plans avec projection"
          eur={totalActionable + totalMissed}
          count={impayes.length}
        />
      </div>

      <ImpayesTable data={impayes} />
    </div>
  );
}

function SummaryBox({
  title,
  subtitle,
  eur,
  count,
  tone,
}: {
  title: string;
  subtitle?: string;
  eur: number;
  count: number;
  tone?: "warn" | "danger";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="text-[12px] font-medium text-zinc-500 uppercase tracking-wide">
        {title}
      </div>
      <div
        className={
          tone === "warn"
            ? "text-[28px] font-semibold text-amber-600 tabular-nums leading-none tracking-tight mt-3"
            : tone === "danger"
              ? "text-[28px] font-semibold text-red-600 tabular-nums leading-none tracking-tight mt-3"
              : "text-[28px] font-semibold text-zinc-900 tabular-nums leading-none tracking-tight mt-3"
        }
      >
        {formatEur(eur)}
      </div>
      <div className="text-[12px] text-zinc-500 mt-3">
        {count} échéance{count > 1 ? "s" : ""}
        {subtitle && <> · {subtitle}</>}
      </div>
    </div>
  );
}
