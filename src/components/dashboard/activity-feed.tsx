type Transaction = {
  id: string;
  type: string;
  direction: string;
  status: string;
  amount: string;
  createdAt: Date;
};

export default function ActivityFeed({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-6">
      <h2 className="mb-4 text-lg font-semibold">
        Recent Activity
      </h2>

      <div className="space-y-3 text-sm">
        {transactions.length === 0 ? <p className="text-zinc-500">No wallet activity yet.</p> : transactions.map((transaction) => (
          <div key={transaction.id} className="flex justify-between gap-3 rounded-lg bg-zinc-950 p-3">
            <div><p className="capitalize text-zinc-200">{transaction.type}</p><p className="text-xs text-zinc-500">{transaction.status}</p></div>
            <p className={transaction.direction === "credit" ? "text-emerald-400" : "text-zinc-200"}>{transaction.direction === "credit" ? "+" : "-"}{transaction.amount} USDC</p>
          </div>
        ))}
      </div>
    </div>
  );
}
