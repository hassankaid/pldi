import { getAllCustomers } from "@/lib/data/customers";
import { CustomersTable } from "./customers-table";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getAllCustomers();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} clients · Triés par CA décroissant
        </p>
      </header>
      <CustomersTable data={customers} />
    </div>
  );
}
