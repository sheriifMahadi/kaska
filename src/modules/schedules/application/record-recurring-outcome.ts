import { and, eq } from "drizzle-orm";

import { recurringJobs } from "@/db/schema";
import { parseUsdc } from "@/modules/payments/domain/usdc";
import { shouldAutoPauseAfterRefund } from
  "@/modules/schedules/domain/recurring-job";
import type { DatabaseTransaction } from
  "@/modules/tasks/application/persist-paid-task";

export async function recordRecurringSettlement(
  transaction: DatabaseTransaction,
  input: {
    recurringJobId: string | null;
    outcome: "charge" | "refund";
    amount: string;
    now: Date;
  }
) {
  if (!input.recurringJobId) return;
  const [job] = await transaction.select().from(recurringJobs)
    .where(eq(recurringJobs.id, input.recurringJobId))
    .limit(1)
    .for("update");
  if (!job) return;

  if (input.outcome === "charge") {
    const spent = parseUsdc(job.spentAmount).microUsdc;
    const amount = parseUsdc(input.amount).microUsdc;
    const limit = parseUsdc(job.spendingLimit).microUsdc;
    const newSpent = spent + amount;
    const limitReached = newSpent + parseUsdc(job.pricePerRun).microUsdc > limit;
    await transaction.update(recurringJobs).set({
      spentAmount: microUsdcToDecimal(newSpent),
      consecutiveFailures: 0,
      status: job.status === "active" && limitReached
        ? "auto_paused"
        : job.status,
      statusReason: job.status === "active"
        ? limitReached
          ? "The spending limit cannot cover another run"
          : null
        : job.statusReason,
      pausedAt: job.status === "active" && limitReached
        ? input.now
        : job.pausedAt,
      leaseOwner: job.status === "active" && limitReached
        ? null
        : job.leaseOwner,
      leaseExpiresAt: job.status === "active" && limitReached
        ? null
        : job.leaseExpiresAt,
      updatedAt: input.now,
    }).where(eq(recurringJobs.id, job.id));
    return;
  }

  const autoPause = job.status === "active" &&
    shouldAutoPauseAfterRefund(job.consecutiveFailures);
  await transaction.update(recurringJobs).set({
    consecutiveFailures: job.consecutiveFailures + 1,
    status: autoPause ? "auto_paused" : job.status,
    statusReason: autoPause
      ? "Three consecutive runs were refunded"
      : job.statusReason,
    pausedAt: autoPause ? input.now : job.pausedAt,
    leaseOwner: autoPause ? null : job.leaseOwner,
    leaseExpiresAt: autoPause ? null : job.leaseExpiresAt,
    updatedAt: input.now,
  }).where(eq(recurringJobs.id, job.id));
}

export async function pauseRecurringJobForPaymentProblem(
  transaction: DatabaseTransaction,
  recurringJobId: string | null,
  reason: string,
  now: Date
) {
  if (!recurringJobId) return;
  await transaction.update(recurringJobs).set({
    status: "auto_paused",
    statusReason: reason,
    pausedAt: now,
    leaseOwner: null,
    leaseExpiresAt: null,
    updatedAt: now,
  }).where(and(
    eq(recurringJobs.id, recurringJobId),
    eq(recurringJobs.status, "active")
  ));
}

function microUsdcToDecimal(value: bigint) {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
