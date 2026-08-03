export const MAX_WALLET_PROVISIONING_ATTEMPTS = 5;

const RETRY_DELAYS_MS = [
  60 * 1_000,
  5 * 60 * 1_000,
  15 * 60 * 1_000,
  60 * 60 * 1_000,
] as const;

export function nextWalletProvisioningAttempt(
  attempt: number,
  now = new Date()
) {
  if (attempt >= MAX_WALLET_PROVISIONING_ATTEMPTS) {
    return null;
  }

  const delay =
    RETRY_DELAYS_MS[
      Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)
    ];

  return new Date(now.getTime() + delay);
}
