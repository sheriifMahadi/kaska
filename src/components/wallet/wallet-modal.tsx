"use client";

type Wallet = {
  address: string;
};

type Props = {
  modal: "deposit" | "withdraw" | null;
  wallet: Wallet;
  setModal: React.Dispatch<
    React.SetStateAction<"deposit" | "withdraw" | null>
  >;
};

export default function WalletModal({
  modal,
  wallet,
  setModal,
}: Props) {
  if (!modal) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setModal(null)}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-6 right-6 z-50 w-[420px] overflow-hidden rounded-2xl border border-yellow-500/50 bg-zinc-950/98 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,.8)]"
      >
        <div className="border-b border-zinc-800 px-5 py-4">

          <h2 className="text-lg font-semibold text-white">
            {modal === "deposit"
              ? "Deposit USDC"
              : "Withdraw USDC"}
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            {modal === "deposit"
              ? "Fund your Kaska wallet"
              : "Transfer funds from your Kaska wallet"}
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

              <code className="block rounded-xl bg-black p-4 break-all font-mono text-xs text-green-400">
                {wallet.address}
              </code>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    wallet.address
                  )
                }
                className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white hover:bg-violet-500"
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
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-yellow-500"
                />

              </div>

              <div>

                <label className="mb-2 block text-sm text-zinc-400">
                  Amount (USDC)
                </label>

                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-yellow-500"
                />

              </div>

              <button className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white hover:bg-violet-500">
                Send
              </button>

            </div>
          )}

        </div>
      </div>
    </>
  );
}