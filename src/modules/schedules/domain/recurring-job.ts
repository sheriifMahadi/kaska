import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";

export const RECURRING_JOB_STATUSES = [
  "active",
  "paused",
  "auto_paused",
  "completed",
  "cancelled",
] as const;

export type RecurringJobStatus =
  (typeof RECURRING_JOB_STATUSES)[number];

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 30 * 24 * 60;
export const MAX_CONSECUTIVE_REFUNDS = 3;

export type RecurringJobInput = {
  userAgentId: string;
  name: string;
  instructions: string;
  intervalMinutes: number;
  spendingLimit: string;
  timezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusTransitions: Record<
  RecurringJobStatus,
  readonly RecurringJobStatus[]
> = {
  active: ["paused", "auto_paused", "completed", "cancelled"],
  paused: ["active", "completed", "cancelled"],
  auto_paused: ["active", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionRecurringJob(
  from: RecurringJobStatus,
  to: RecurringJobStatus
) {
  return statusTransitions[from].includes(to);
}

export function recurringJobCanRun(status: RecurringJobStatus) {
  return status === "active";
}

export function parseRecurringJobInput(input: unknown): RecurringJobInput {
  if (!input || typeof input !== "object") {
    throw new Error("Recurring job details are required");
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.userAgentId !== "string" ||
    !UUID_PATTERN.test(value.userAgentId)
  ) throw new Error("A valid employed agent is required");

  const name = requiredText(value.name, "Job name", 2, 120);
  const instructions = requiredText(
    value.instructions,
    "Instructions",
    10,
    10_000
  );
  if (
    typeof value.intervalMinutes !== "number" ||
    !Number.isInteger(value.intervalMinutes) ||
    value.intervalMinutes < MIN_INTERVAL_MINUTES ||
    value.intervalMinutes > MAX_INTERVAL_MINUTES
  ) {
    throw new Error("Interval must be between 1 minute and 30 days");
  }
  if (typeof value.spendingLimit !== "string") {
    throw new Error("A valid spending limit is required");
  }
  const spendingLimit = parsePositiveUsdc(value.spendingLimit).decimal;
  if (typeof value.timezone !== "string" || !isTimezone(value.timezone)) {
    throw new Error("A valid timezone is required");
  }
  const startsAt = optionalDate(value.startsAt, "Start time");
  const endsAt = optionalDate(value.endsAt, "End time");
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new Error("End time must be after the start time");
  }

  return {
    userAgentId: value.userAgentId,
    name,
    instructions,
    intervalMinutes: value.intervalMinutes,
    spendingLimit,
    timezone: value.timezone,
    startsAt,
    endsAt,
  };
}

export function validateRecurringJobPrice(
  spendingLimit: string,
  pricePerRun: string
) {
  const limit = parsePositiveUsdc(spendingLimit);
  const price = parsePositiveUsdc(pricePerRun);
  if (limit.microUsdc < price.microUsdc) {
    throw new Error("Spending limit must cover at least one run");
  }
  return { spendingLimit: limit.decimal, pricePerRun: price.decimal };
}

export function recurringBudgetAllowsRun(
  spentAmount: string,
  spendingLimit: string,
  pricePerRun: string
) {
  const spent = parsePositiveOrZero(spentAmount);
  const limit = parsePositiveUsdc(spendingLimit).microUsdc;
  const price = parsePositiveUsdc(pricePerRun).microUsdc;
  return spent + price <= limit;
}

export function shouldAutoPauseAfterRefund(currentFailures: number) {
  return currentFailures + 1 >= MAX_CONSECUTIVE_REFUNDS;
}

function parsePositiveOrZero(value: string) {
  if (value === "0" || /^0\.0+$/.test(value)) return 0n;
  return parsePositiveUsdc(value).microUsdc;
}

function requiredText(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number
) {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error(`${label} must be ${minimum}-${maximum} characters`);
  }
  return normalized;
}

function optionalDate(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} is invalid`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
