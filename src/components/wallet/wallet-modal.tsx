"use client";

import DepositPanel from "./deposit-panel";

type Wallet = {
  address: string;
};

type ModalType =
  | "deposit"
  | "withdraw"
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
  if (!modal) return null;

  const title =
    modal === "deposit"
      ? "Deposit USDC"
      : "Withdraw USDC";

  const description =
    modal === "deposit"
      ? "Fund your Kaska wallet."
      : "Transfer funds from your Kaska wallet.";

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
            <DepositPanel address={wallet.address} />
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

        </div>
      </div>
    </>
  );
}
