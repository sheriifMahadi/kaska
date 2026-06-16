"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/shared/stat-card";

type Wallet = {
  id: string;
  userId: string;
  circleWalletId: string;
  address: string | null;
  status: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  createdAt: string;
};

export function DashboardClient() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeDashboard() {
      try {
        // 1. Ensure wallet exists
        await fetch("/api/wallet/ensure", {
          method: "POST",
        });

        // 2. Fetch wallet
        const walletRes = await fetch("/api/wallet", {
          cache: "no-store",
        });

        if (!walletRes.ok) {
          throw new Error("Failed to load wallet");
        }

        const walletData = await walletRes.json();
        setWallet(walletData);

        // 3. Fetch transactions (THIS WAS MISSING)
        const txRes = await fetch("/api/wallet/transactions", {
          cache: "no-store",
        });

        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactions(txData);
        }
      } catch (err) {
        console.error("[Dashboard]", err);
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    initializeDashboard();
  }, []);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Wallet Balance" value="0 USDC" />
        <StatCard title="Wallet Status" value={wallet?.status ?? "Unknown"} />
        <StatCard title="Transactions" value={transactions.length.toString()} />
        <StatCard title="Tasks" value="0" />
      </div>

      {/* Wallet Info */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">Wallet Information</h3>

        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Circle Wallet ID:</span>{" "}
            {wallet?.circleWalletId}
          </div>

          <div>
            <span className="font-medium">Address:</span>{" "}
            {wallet?.address ?? "Not assigned yet"}
          </div>

          <div>
            <span className="font-medium">Status:</span>{" "}
            {wallet?.status}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-lg border p-4">
        <h3 className="font-medium mb-2">Recent Transactions</h3>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between">
                <span>{tx.type}</span>
                <span>
                  {tx.amount} {tx.currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}