import DashboardLayout from "@/components/layout/dashboard-layout";

export default function TransactionsPage() {
  return (
    <DashboardLayout>
      <div className="p-8 text-white">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="mt-2 text-zinc-400">
          View deposits, withdrawals and spending history.
        </p>
      </div>
    </DashboardLayout>
  );
}
