import { isAddress, type Address } from "viem";

import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WithdrawalRequest = {
  recipient: Address;
  amount: string;
  microUsdc: bigint;
  idempotencyKey: string;
};

export function parseWithdrawalRequest(
  input: unknown
): WithdrawalRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Withdrawal details are required");
  }

  const body = input as Record<string, unknown>;

  if (
    typeof body.recipient !== "string" ||
    !isAddress(body.recipient)
  ) {
    throw new Error("A valid Arc recipient address is required");
  }

  if (typeof body.amount !== "string") {
    throw new Error("A valid USDC amount is required");
  }

  if (
    typeof body.idempotencyKey !== "string" ||
    !UUID_PATTERN.test(body.idempotencyKey)
  ) {
    throw new Error("A valid withdrawal request ID is required");
  }

  const amount = parsePositiveUsdc(body.amount);

  return {
    recipient: body.recipient,
    amount: amount.decimal,
    microUsdc: amount.microUsdc,
    idempotencyKey: body.idempotencyKey,
  };
}
