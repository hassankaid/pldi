import { PageHeader } from "@/components/page-header";
import { getAllCustomers } from "@/lib/data/customers";
import { CustomersTable } from "./customers-table";
import { formatInteger } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getAllCustomers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle={`${formatInteger(customers.length)} clients · triés par CA décroissant`}
      />
      <CustomersTable data={customers} />
    </div>
  );
}
