"use client";

import { useEffect, useState } from "react";
import { ListLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

type WalletTransaction = {
  id: string;
  title: string | null;
  type: string;
  direction: "credit" | "debit";
  status: "pending" | "confirmed" | "failed";
  amount: string;
  currency: string;
  circleTransactionId: string | null;
  txHash: string | null;
  error: string | null;
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
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const pendingCount = transactions.filter(
    (transaction) => transaction.status === "pending"
  ).length;
  const pageCount = Math.max(
    1,
    Math.ceil(transactions.length / pageSize)
  );
  const visibleTransactions = transactions.slice(
    page * pageSize,
    page * pageSize + pageSize
  );

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
    const interval = window.setInterval(loadTransactions, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Transactions</h2>

      {pendingCount > 0 && (
        <p className="text-sm text-amber-300">
          {pendingCount} transaction{pendingCount === 1 ? " is" : "s are"}{" "}
          still being confirmed.
        </p>
      )}

      <div className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-950">
        {loading && (
          <div className="p-4"><ListLoadingSkeleton rows={3} /></div>
        )}

        {!loading && transactions.length === 0 && (
          <p className="px-6 py-5 text-sm text-zinc-500">
            No wallet transactions yet.
          </p>
        )}

        {visibleTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between gap-4 px-6 py-5"
          >
            <div>
              <p className="capitalize text-white">
                {transaction.title ?? transaction.type}
              </p>
              {transaction.title && (
                <p className="mt-1 capitalize text-sm text-zinc-500">
                  {transaction.type}
                </p>
              )}
              <p className="mt-1 text-sm text-zinc-500">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(transaction.createdAt))}
              </p>
              {transaction.txHash && (
                <code className="mt-1 block text-xs text-zinc-600">
                  {transaction.txHash.slice(0, 10)}…
                  {transaction.txHash.slice(-8)}
                </code>
              )}
              {transaction.status === "failed" && transaction.error && (
                <p className="mt-1 max-w-md text-xs text-red-400">
                  {transaction.error}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="font-medium text-white">
                {transaction.direction === "credit" ? "+" : "-"}
                {transaction.amount} {transaction.currency}
              </p>
              <p
                className={`mt-1 capitalize ${
                  transaction.status === "confirmed"
                    ? "text-emerald-400"
                    : transaction.status === "failed"
                      ? "text-red-400"
                      : "text-amber-300"
                }`}
              >
                {transaction.status}
              </p>
            </div>
          </div>
        ))}
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-3">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)} aria-label="Previous transactions" className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-xs text-zinc-600">{page + 1} / {pageCount}</span>
          <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)} aria-label="Next transactions" className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      ) : null}
    </div>
  );
}
