"use client";

import { useEffect, useState } from "react";

type WalletTransaction = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  referenceId: string | null;
  source: string;
  createdAt: string;
};

export default function WalletTransactions() {
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
  }, []);

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

            <p className="text-right font-medium text-white">
              {transaction.amount} {transaction.currency}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
