"use client";

import { useEffect, useState } from "react";

type WalletTransaction = {
  id: string;
  type: string;
  direction: "credit" | "debit";
  status: "pending" | "confirmed" | "failed";
  amount: string;
  currency: string;
  circleTransactionId: string | null;
  txHash: string | null;
  source: string;
  createdAt: string;
  confirmedAt: string | null;
  failedAt: string | null;
};

type Props = {
  refreshKey?: number;
};

export default function WalletTransactions({ refreshKey = 0 }: Props) {
  const [transactions, setTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      try {
        const response = await fetch("/api/wallet/transactions", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled) {
          setTransactions(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Transactions</h2>

      <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950">
        {loading && (
          <p className="px-6 py-5 text-sm text-zinc-500">
            Loading transactions...
          </p>
        )}

        {!loading && transactions.length === 0 && (
          <p className="px-6 py-5 text-sm text-zinc-500">
            No wallet transactions yet.
          </p>
        )}

        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between gap-4 px-6 py-5"
          >
            <div>
              <p className="capitalize text-white">
                {transaction.type}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(transaction.createdAt))}
              </p>
            </div>

            <div className="text-right">
              <p className="font-medium text-white">
                {transaction.direction === "credit" ? "+" : "-"}
                {transaction.amount} {transaction.currency}
              </p>
              <p className="mt-1 capitalize text-zinc-500">
                {transaction.status}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
