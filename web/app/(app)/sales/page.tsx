import { getAllSales } from "@/lib/data/sales";
import { SalesTable } from "./sales-table";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await getAllSales();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
        <p className="text-sm text-muted-foreground">
          {sales.length} ventes au total · Cliquez une ligne pour voir le détail
        </p>
      </header>
      <SalesTable data={sales} />
    </div>
  );
}
