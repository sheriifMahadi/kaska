export const WALLET_TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
] as const;

export type WalletTransactionType =
  (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_TRANSACTION_DIRECTIONS = [
  "credit",
  "debit",
] as const;

export type WalletTransactionDirection =
  (typeof WALLET_TRANSACTION_DIRECTIONS)[number];

export const WALLET_TRANSACTION_STATUSES = [
  "pending",
  "confirmed",
  "failed",
] as const;

export type WalletTransactionStatus =
  (typeof WALLET_TRANSACTION_STATUSES)[number];

export const WALLET_TRANSACTION_SOURCES = [
  "arc",
  "circle",
] as const;

export type WalletTransactionSource =
  (typeof WALLET_TRANSACTION_SOURCES)[number];

export function transactionDirection(
  type: WalletTransactionType
): WalletTransactionDirection {
  return type === "deposit" ? "credit" : "debit";
}
