const USDC_SCALE = 6;
const USDC_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/;
const EXTERNAL_USDC_PATTERN = /^(0|[1-9]\d*)(?:\.(\d+))?$/;

export type UsdcAmount = {
  decimal: string;
  microUsdc: bigint;
};

export function parseUsdc(value: string): UsdcAmount {
  const normalized = value.trim();
  const match = USDC_PATTERN.exec(normalized);

  if (!match) {
    throw new Error(
      "USDC amount must be a non-negative decimal with at most 6 decimal places"
    );
  }

  const whole = match[1];
  const fraction = (match[2] ?? "").padEnd(
    USDC_SCALE,
    "0"
  );
  const microUsdc =
    BigInt(whole) * BigInt(10) ** BigInt(USDC_SCALE) +
    BigInt(fraction || "0");

  return {
    decimal: formatUsdc(microUsdc),
    microUsdc,
  };
}

export function parsePositiveUsdc(
  value: string
): UsdcAmount {
  const amount = parseUsdc(value);

  if (amount.microUsdc === BigInt(0)) {
    throw new Error("USDC amount must be greater than zero");
  }

  return amount;
}

// External providers may report Arc's gas-adjusted USDC balance with more
// precision than Kaska permits for user-entered transfers. Always round down
// so the displayed spendable amount is never overstated.
export function parseExternalUsdcBalance(value: string): UsdcAmount {
  const normalized = value.trim();
  const match = EXTERNAL_USDC_PATTERN.exec(normalized);

  if (!match) {
    throw new Error("External USDC balance is not a valid decimal");
  }

  const fraction = (match[2] ?? "")
    .slice(0, USDC_SCALE)
    .padEnd(USDC_SCALE, "0");
  const microUsdc =
    BigInt(match[1]) * BigInt(10) ** BigInt(USDC_SCALE) +
    BigInt(fraction || "0");

  return {
    decimal: formatUsdc(microUsdc),
    microUsdc,
  };
}

export function formatUsdc(microUsdc: bigint): string {
  if (microUsdc < BigInt(0)) {
    throw new Error("USDC amount cannot be negative");
  }

  const scale = BigInt(10) ** BigInt(USDC_SCALE);
  const whole = microUsdc / scale;
  const fraction = (microUsdc % scale)
    .toString()
    .padStart(USDC_SCALE, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
}
