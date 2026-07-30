"use client";

import { useState } from "react";

type Wallet = {
  address: string;
  spendApproval: string;
};

type ModalType =
  | "deposit"
  | "withdraw"
  | "approval"
  | null;

type Props = {
  modal: ModalType;
  wallet: Wallet;
  setModal: React.Dispatch<
    React.SetStateAction<ModalType>
  >;
};

export default function WalletModal({
  modal,
  wallet,
  setModal,
}: Props) {
  const [approvalAmount, setApprovalAmount] =
    useState("");

  if (!modal) return null;

  async function handleApprove() {
    console.log(
      "Approve:",
      approvalAmount,
      "USDC"
    );

    // Next step:
    // POST /api/wallet/approve

    setModal(null);
  }

  async function handleRevoke() {
    console.log("Revoke approval");

    // Next step:
    // POST /api/wallet/revoke

    setModal(null);
  }

  const title =
    modal === "deposit"
      ? "Deposit USDC"
      : modal === "withdraw"
      ? "Withdraw USDC"
      : "Manage Spend Approval";

  const description =
    modal === "deposit"
      ? "Fund your Kaska wallet."
      : modal === "withdraw"
      ? "Transfer funds from your Kaska wallet."
      : "Control how much USDC Kaska is allowed to move into escrow.";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => setModal(null)}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-6 z-50 w-[420px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_30px_120px_rgba(0,0,0,.8)]"
      >
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            {description}
          </p>
        </div>

        <div className="p-5">
          {modal === "deposit" && (
            <div className="space-y-5">
              <p className="text-sm text-zinc-400">
                Send{" "}
                <span className="font-medium text-white">
                  USDC on Arc Testnet
                </span>{" "}
                to the address below.
              </p>

              <code className="block break-all rounded-xl bg-black p-4 font-mono text-xs text-green-400">
                {wallet.address}
              </code>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    wallet.address
                  )
                }
                className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500"
              >
                Copy Address
              </button>
            </div>
          )}

          {modal === "withdraw" && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Recipient Address
                </label>

                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  Amount (USDC)
                </label>

                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-violet-500"
                />
              </div>

              <button className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500">
                Send
              </button>
            </div>
          )}

          {modal === "approval" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Current Approval
                </p>

                <p className="mt-2 text-3xl font-bold text-white">
                  {wallet.spendApproval} USDC
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  This is the maximum amount the escrow
                  contract can transfer from your wallet
                  when creating tasks.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-400">
                  New Approval Amount
                </label>

                <input
                  type="number"
                  placeholder="100"
                  value={approvalAmount}
                  onChange={(e) =>
                    setApprovalAmount(e.target.value)
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none transition focus:border-violet-500"
                />
              </div>

              <button
                onClick={handleApprove}
                className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500"
              >
                Update Approval
              </button>

              <button
                onClick={handleRevoke}
                className="w-full rounded-xl border border-red-500/40 py-3 font-medium text-red-400 transition hover:border-red-400 hover:bg-red-500/10"
              >
                Revoke Approval
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}