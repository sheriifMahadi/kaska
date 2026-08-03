export type WalletBalance = {
  totalMicroUsdc: bigint;
  committedMicroUsdc: bigint;
  availableMicroUsdc: bigint;
  consistent: boolean;
};

export function calculateWalletBalance(
  totalMicroUsdc: bigint,
  committedMicroUsdc: bigint
): WalletBalance {
  if (totalMicroUsdc < 0n || committedMicroUsdc < 0n) {
    throw new Error("Wallet balances cannot be negative");
  }

  const consistent = committedMicroUsdc <= totalMicroUsdc;

  return {
    totalMicroUsdc,
    committedMicroUsdc,
    availableMicroUsdc: consistent
      ? totalMicroUsdc - committedMicroUsdc
      : 0n,
    consistent,
  };
}
