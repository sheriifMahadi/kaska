"use client";

import DepositPanel from "./deposit-panel";
import WithdrawalPanel from "./withdrawal-panel";

type Wallet = {
  address: string;
  availableBalance: string;
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
  onWithdrawalSubmitted: () => Promise<void>;
};

export default function WalletModal({
  modal,
  wallet,
  setModal,
  onWithdrawalSubmitted,
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
            <WithdrawalPanel
              availableBalance={wallet.availableBalance}
              onSubmitted={onWithdrawalSubmitted}
            />
          )}

        </div>
      </div>
    </>
  );
}
