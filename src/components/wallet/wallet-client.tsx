"use client";

import { useEffect, useState } from "react";

import WalletBalanceCard from "./wallet-balance-card";
import WalletModal from "./wallet-modal";
import WalletTransactions from "./wallet-transactions";

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
  const [modal, setModal] = useState<
    "deposit" | "withdraw" | null
  >(null);

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

    const interval = setInterval(loadWallet, 10000);

    return () => clearInterval(interval);
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
    <>
      <div className="space-y-8">

        <div>

          <h1 className="text-3xl font-bold text-white">
            Wallet
          </h1>

          <p className="mt-2 text-zinc-400">
            Your Arc treasury wallet.
          </p>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="grid gap-4 md:grid-cols-3">

            <WalletBalanceCard
              title="Available"
              value={wallet.availableBalance}
            />

            <WalletBalanceCard
              title="Locked"
              value={wallet.lockedBalance}
            />

            <WalletBalanceCard
              title="Total"
              value={wallet.totalBalance}
            />

          </div>

          <div className="mt-6 flex gap-4">

            <button
              onClick={() => setModal("deposit")}
              className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
            >
              Deposit
            </button>

            <button
              onClick={() => setModal("withdraw")}
              className="rounded-lg border border-zinc-700 px-6 py-3 text-white hover:border-violet-500"
            >
              Withdraw
            </button>

          </div>

        </div>

        <WalletTransactions />

      </div>

      <WalletModal
        modal={modal}
        wallet={wallet}
        setModal={setModal}
      />
    </>
  );
}