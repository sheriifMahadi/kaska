"use client";

const transactions = [
  {
    id: 1,
    type: "Deposit",
    amount: "+0.40 USDC",
    status: "Completed",
    date: "Just now",
  },
    {
    id: 2,
    type: "Deposit",
    amount: "+0.40 USDC",
    status: "Completed",
    date: "Just now",
  },
    {
    id: 3,
    type: "Deposit",
    amount: "+30.0 USDC",
    status: "Completed",
    date: "Just now",
  },
    {
    id: 4,
    type: "Withdrawal",
    amount: "-5 USDC",
    status: "Completed",
    date: "2 days ago",
  },
    {
    id: 5,
    type: "Withdrawal",
    amount: "-3.40 USDC",
    status: "Completed",
    date: "5mins",
  },
];

export default function WalletTransactions() {
  return (
    <div className="mt-8 space-y-4">

      <h2 className="text-center text-2xl font-semibold text-white">
        Transactions
      </h2>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800">

        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between px-6 py-5"
          >
            <div>

              <p className="font-medium text-white">
                {tx.type}
              </p>

              <p className="text-sm text-zinc-500">
                {tx.date}
              </p>

            </div>

            <div className="text-right">

              <p className="font-medium text-white">
                {tx.amount}
              </p>

              <p className="text-sm text-zinc-500">
                {tx.status}
              </p>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
}