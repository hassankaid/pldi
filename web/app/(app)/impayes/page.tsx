import { getAllImpayes } from "@/lib/data/impayes";
import { ImpayesTable } from "./impayes-table";

export const dynamic = "force-dynamic";

export default async function ImpayesPage() {
  const impayes = await getAllImpayes();

  const totalActionable = impayes
    .filter((i) => i.status === "in_retry" || i.status === "late")
    .reduce((sum, i) => sum + Number(i.expected_eur), 0);

  const totalMissed = impayes
    .filter((i) => i.status === "missed")
    .reduce((sum, i) => sum + Number(i.expected_eur), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Impayés</h1>
        <p className="text-sm text-muted-foreground">
          {impayes.length} échéances détectées · couverture 63% des plans
          (estimé)
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryBox
          title="À actionner (in_retry + late)"
          eur={totalActionable}
          count={
            impayes.filter(
              (i) => i.status === "in_retry" || i.status === "late",
            ).length
          }
          tone="warn"
        />
        <SummaryBox
          title="Missed (>21j)"
          eur={totalMissed}
          count={impayes.filter((i) => i.status === "missed").length}
          tone="danger"
        />
        <SummaryBox
          title="Total"
          eur={totalActionable + totalMissed}
          count={impayes.length}
        />
      </div>

      <ImpayesTable data={impayes} />
    </div>
  );
}

import { formatEur } from "@/lib/format";
import { Card } from "@/components/ui/card";

function SummaryBox({
  title,
  eur,
  count,
  tone,
}: {
  title: string;
  eur: number;
  count: number;
  tone?: "warn" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div
        className={
          tone === "warn"
            ? "text-2xl font-bold text-amber-600 tabular-nums mt-1"
            : tone === "danger"
              ? "text-2xl font-bold text-red-600 tabular-nums mt-1"
              : "text-2xl font-bold tabular-nums mt-1"
        }
      >
        {formatEur(eur)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {count} échéance{count > 1 ? "s" : ""}
      </div>
    </Card>
  );
}
