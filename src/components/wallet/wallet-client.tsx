"use client";

import { useEffect, useState } from "react";

import WalletBalanceCard from "./wallet-balance-card";
import WalletModal from "./wallet-modal";
import WalletTransactions from "./wallet-transactions";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";

type WalletLifecycle = {
  status: "pending" | "active" | "failed";
  address: string | null;
  provisioningAttempts: number;
  provisionedAt: string | null;
  nextProvisioningAttemptAt: string | null;
  automaticRetryScheduled: boolean;
  canRetry: boolean;
};

type WalletBalance = {
  address: string;
  totalBalance: string;
  availableBalance: string;
  committedBalance: string;
  currency: string;
  consistent: boolean;
};

function retryTime(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function WalletClient() {
  const [lifecycle, setLifecycle] =
    useState<WalletLifecycle | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [modal, setModal] = useState<
    "deposit" | "withdraw" | null
  >(null);

  async function loadWallet() {
    try {
      const lifecycleResponse = await fetch("/api/wallet", {
        cache: "no-store",
      });
      const lifecycleData = await lifecycleResponse.json();

      if (!lifecycleResponse.ok) {
        throw new Error(
          lifecycleData.error || "Failed to load wallet status"
        );
      }

      setLifecycle(lifecycleData);

      if (lifecycleData.status !== "active") {
        setWallet(null);
        setError(null);
        return;
      }

      const balanceResponse = await fetch("/api/wallet/balance", {
        cache: "no-store",
      });
      const balanceData = await balanceResponse.json();

      if (!balanceResponse.ok) {
        throw new Error(
          balanceData.error || "Failed to load wallet balance"
        );
      }

      setWallet(balanceData);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load wallet"
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryProvisioning() {
    setRetrying(true);
    setError(null);

    try {
      const response = await fetch("/api/wallet/retry", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Retry could not be started");
      }

      await loadWallet();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Retry could not be started"
      );
    } finally {
      setRetrying(false);
    }
  }

  async function handleWithdrawalSubmitted() {
    await loadWallet();
    setTransactionRefreshKey((value) => value + 1);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadWallet, 0);
    const interval = window.setInterval(loadWallet, 5_000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <PageLoadingSkeleton cards={3} />;
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Wallet</h1>
          <p className="mt-2 text-zinc-400">
            Your Kaska wallet on Arc Testnet.
          </p>
        </div>

        {lifecycle && (
          <span
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
              lifecycle.status === "active"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : lifecycle.status === "failed"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            }`}
          >
            {lifecycle.status}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {lifecycle?.status === "pending" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="text-lg font-semibold text-white">
            Your wallet is being prepared
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Kaska will create your Circle wallet automatically while the
            worker is running. This page refreshes every few seconds.
          </p>
          <p className="mt-4 text-xs text-zinc-500">
            Attempts: {lifecycle.provisioningAttempts}
          </p>
        </div>
      )}

      {lifecycle?.status === "failed" && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="text-lg font-semibold text-white">
            Wallet setup needs attention
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Kaska could not finish creating the wallet. Your account is
            safe and no funds were moved.
          </p>

          {lifecycle.automaticRetryScheduled && (
            <p className="mt-4 text-sm text-amber-300">
              The next automatic retry is scheduled for{" "}
              {retryTime(lifecycle.nextProvisioningAttemptAt)}.
            </p>
          )}

          {lifecycle.canRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={retryProvisioning}
              className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {retrying ? "Starting retry..." : "Try wallet setup again"}
            </button>
          )}

          <p className="mt-4 text-xs text-zinc-500">
            Attempts: {lifecycle.provisioningAttempts}
          </p>
        </div>
      )}

      {lifecycle?.status === "active" && wallet && (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <WalletBalanceCard
                title="Total"
                value={wallet.totalBalance}
              />
              <WalletBalanceCard
                title="Available"
                value={wallet.availableBalance}
              />
              <WalletBalanceCard
                title="Committed"
                value={wallet.committedBalance}
              />
            </div>

            {!wallet.consistent && (
              <p className="mt-4 text-sm text-amber-300">
                Wallet accounting is being reconciled. Spending is
                temporarily unavailable.
              </p>
            )}

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={() => setModal("deposit")}
                className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500"
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setModal("withdraw")}
                className="rounded-lg border border-zinc-700 px-6 py-3 text-white hover:border-violet-500"
              >
                Withdraw
              </button>
            </div>
          </div>

          <WalletTransactions refreshKey={transactionRefreshKey} />

          <WalletModal
            modal={modal}
            wallet={wallet}
            setModal={setModal}
            onWithdrawalSubmitted={handleWithdrawalSubmitted}
          />
        </>
      )}
    </div>
  );
}
