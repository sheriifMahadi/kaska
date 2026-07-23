"use client";

import { useEffect, useState } from "react";

type Wallet = {
  address: string;
  walletId: string;
  totalBalance: string;
  availableBalance: string;
  lockedBalance: string;
  currency: string;
};

export default function WalletClient() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadWallet() {
    try {
      const res = await fetch("/api/wallet/balance");

      if (!res.ok) {
        throw new Error("Failed to load wallet");
      }

      const data = await res.json();
      setWallet(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWallet();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-zinc-400">
        Loading wallet...
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="p-8 text-red-400">
        Wallet not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Wallet
        </h1>

        <p className="mt-2 text-zinc-400">
          Your Arc treasury wallet.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">

        <div>
          <p className="text-sm text-zinc-500">
            Wallet Address
          </p>

          <div className="mt-2 flex gap-3">
            <code className="flex-1 rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300 break-all">
              {wallet.address}
            </code>

            <button
              onClick={() =>
                navigator.clipboard.writeText(wallet.address)
              }
              className="rounded-lg bg-violet-600 px-4 text-white hover:bg-violet-500"
            >
              Copy
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <BalanceCard
            title="Available"
            value={wallet.availableBalance}
          />

          <BalanceCard
            title="Locked"
            value={wallet.lockedBalance}
          />

          <BalanceCard
            title="Total"
            value={wallet.totalBalance}
          />

        </div>

        <div className="flex gap-4">

          <button className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500">
            Deposit
          </button>

          <button className="rounded-lg border border-zinc-700 px-6 py-3 text-white hover:border-violet-500">
            Withdraw
          </button>

          <button
            onClick={loadWallet}
            className="rounded-lg border border-zinc-700 px-6 py-3 text-white hover:border-violet-500"
          >
            Refresh
          </button>

        </div>

      </div>
    </div>
  );
}

function BalanceCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value} USDC
      </p>
    </div>
  );
}