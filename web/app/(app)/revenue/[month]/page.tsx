import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, TrendingUp, Receipt, Undo2, XCircle, CalendarClock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { MonthDrilldown } from "@/components/month-drilldown";
import { buttonVariants } from "@/components/ui/button";
import {
  getMonthAccounting,
  getMonthPayments,
  getMonthSchedule,
  getAvailableMonths,
  isValidMonthSlug,
  shiftMonth,
} from "@/lib/data/monthly";
import { formatEur, formatMonthYear } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MonthDetailPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;

  if (!isValidMonthSlug(month)) {
    notFound();
  }

  const [acc, paid, failed, refunds, upcoming, available] = await Promise.all([
    getMonthAccounting(month),
    getMonthPayments(month, "paid"),
    getMonthPayments(month, "failed"),
    getMonthPayments(month, "refund"),
    getMonthSchedule(month),
    getAvailableMonths(),
  ]);

  if (!acc) {
    notFound();
  }

  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const hasPrev = available.includes(prev);
  const hasNext = available.includes(next);

  const provisional = acc.revenue_status === "provisional";
  const caBrut = Number(acc.ca_brut_eur);
  const refundEur = Number(acc.refund_eur);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Compta mensuelle", href: "/revenue" },
          { label: formatMonthYear(`${month}-01`) },
        ]}
        title={<span className="capitalize">{formatMonthYear(`${month}-01`)}</span>}
        subtitle={
          <span className="inline-flex items-center gap-2 mt-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                provisional
                  ? "bg-warn-soft text-warn"
                  : "bg-info-soft text-info",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  provisional ? "bg-warn" : "bg-info",
                )}
              />
              {provisional ? "Provisoire" : "Finalisé"}
            </span>
            {provisional && (
              <span className="text-[12px] text-ink-soft">
                Chiffres susceptibles d'évoluer jusqu'à clôture
              </span>
            )}
          </span>
        }
        actions={
          <div className="flex items-center gap-1">
            {hasPrev ? (
              <Link
                href={`/revenue/${prev}`}
                className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                aria-label="Mois précédent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon-sm" }),
                  "opacity-40 pointer-events-none",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {hasNext ? (
              <Link
                href={`/revenue/${next}`}
                className={buttonVariants({ variant: "outline", size: "icon-sm" })}
                aria-label="Mois suivant"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon-sm" }),
                  "opacity-40 pointer-events-none",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        }
      />

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="CA net encaissé"
          value={formatEur(Number(acc.ca_net_eur))}
          subtitle={`${acc.succeeded_count} charges · ${acc.refund_count} refund${acc.refund_count > 1 ? "s" : ""}`}
          variant="brand"
          icon={TrendingUp}
        />
        <KpiCard
          title="CA brut"
          value={formatEur(caBrut)}
          subtitle="avant remboursements"
          variant="default"
          icon={Receipt}
        />
        <KpiCard
          title="Remboursé"
          value={refundEur > 0 ? `−${formatEur(refundEur)}` : "—"}
          subtitle={`${acc.refund_count} remboursement${acc.refund_count > 1 ? "s" : ""}`}
          variant={refundEur > 0 ? "refund" : "default"}
          icon={Undo2}
        />
        <KpiCard
          title="Échecs de paiement"
          value={acc.failed_count}
          subtitle={`${formatEur(Number(acc.failed_attempted_eur))} tentés`}
          variant={acc.failed_count > 0 ? "danger" : "default"}
          icon={XCircle}
        />
        <KpiCard
          title="À venir ce mois"
          value={formatEur(Number(acc.a_venir_est_eur))}
          subtitle={`${acc.a_venir_est_count} échéances · estimé`}
          variant="info"
          icon={CalendarClock}
        />
        <KpiCard
          title="En retard ce mois"
          value={formatEur(Number(acc.en_retard_est_eur))}
          subtitle={`${acc.en_retard_est_count} échéances · estimé`}
          variant="warning"
          icon={AlertTriangle}
        />
      </div>

      <p className="text-[11px] text-ink-soft -mt-2">
        Cartes vertes/grises = <span className="font-medium">factuel</span> (argent réellement
        encaissé). Cartes bleue/ambre = <span className="font-medium">estimé</span> d'après
        l'échéancier projeté, non encore encaissé.
      </p>

      <MonthDrilldown
        paid={paid}
        failed={failed}
        refunds={refunds}
        upcoming={upcoming}
        caBrutEur={caBrut}
        refundEur={refundEur}
      />
    </div>
  );
}
