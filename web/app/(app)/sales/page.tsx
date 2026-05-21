import { PageHeader } from "@/components/page-header";
import { getAllSales } from "@/lib/data/sales";
import { SalesTable } from "./sales-table";
import { formatInteger } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await getAllSales();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes"
        subtitle={`${formatInteger(sales.length)} ventes au total · cliquez une ligne pour le détail`}
      />
      <SalesTable data={sales} />
    </div>
  );
}
