import { and, eq, gt, inArray, sql } from "drizzle-orm";

import {
  agents,
  recurringJobOccurrences,
  recurringJobs,
  taskPayments,
  tasks,
  userAgents,
  wallets,
} from "@/db/schema";
import { db } from "@/lib/db";
import { advanceSchedule, scheduledRunIsStale } from
  "@/modules/schedules/domain/schedule";
import { recurringBudgetAllowsRun } from
  "@/modules/schedules/domain/recurring-job";
import { persistPaidTask } from
  "@/modules/tasks/application/persist-paid-task";

const UNSETTLED_PAYMENT_STATES = [
  "approval_pending",
  "escrow_pending",
  "locked",
  "charge_pending",
  "refund_pending",
  "manual_review",
] as const;

export async function materializeScheduledTask(
  jobId: string,
  schedulerId: string,
  now = new Date()
) {
  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${jobId}))`
    );
    const [context] = await transaction.select({
      job: recurringJobs,
      employmentStatus: userAgents.status,
      agentActive: agents.isActive,
      supportsRecurring: agents.supportsRecurring,
      walletId: wallets.id,
      walletStatus: wallets.status,
    }).from(recurringJobs)
      .innerJoin(userAgents, eq(userAgents.id, recurringJobs.userAgentId))
      .innerJoin(agents, eq(agents.id, userAgents.agentId))
      .innerJoin(wallets, eq(wallets.userId, recurringJobs.userId))
      .where(and(
        eq(recurringJobs.id, jobId),
        eq(recurringJobs.status, "active"),
        eq(recurringJobs.leaseOwner, schedulerId),
        gt(recurringJobs.leaseExpiresAt, now)
      ))
      .limit(1)
      .for("update");

    if (!context || !context.job.nextRunAt) {
      throw new Error("The recurring job claim is no longer valid");
    }
    if (
      context.employmentStatus !== "active" ||
      !context.agentActive ||
      !context.supportsRecurring
    ) throw new Error("The employed agent cannot accept recurring work");
    if (context.walletStatus !== "active") {
      throw new Error("The recurring job wallet is not active");
    }

    const scheduledFor = context.job.nextRunAt;
    const next = advanceSchedule({
      scheduledFor,
      endsAt: context.job.endsAt,
      intervalMinutes: context.job.intervalMinutes,
      now,
    });
    const [existingOccurrence] = await transaction
      .select({ id: recurringJobOccurrences.id })
      .from(recurringJobOccurrences)
      .where(and(
        eq(recurringJobOccurrences.recurringJobId, jobId),
        eq(recurringJobOccurrences.scheduledFor, scheduledFor)
      ))
      .limit(1);
    if (existingOccurrence) {
      await advanceJob(transaction, context.job, next, now, 0, false);
      return { outcome: "already_recorded" as const, task: null };
    }

    if (scheduledRunIsStale(
      scheduledFor,
      context.job.intervalMinutes,
      now
    )) {
      await transaction.insert(recurringJobOccurrences).values({
        recurringJobId: jobId,
        scheduledFor,
        status: "skipped_missed",
        reason: "The scheduler recovered after this run window passed",
      });
      await advanceJob(
        transaction,
        context.job,
        next,
        now,
        next.missedRuns + 1,
        false
      );
      return { outcome: "skipped_missed" as const, task: null };
    }

    if (!recurringBudgetAllowsRun(
      context.job.spentAmount,
      context.job.spendingLimit,
      context.job.pricePerRun
    )) {
      await transaction.insert(recurringJobOccurrences).values({
        recurringJobId: jobId,
        scheduledFor,
        status: "skipped_limit",
        reason: "The remaining spending limit cannot cover this run",
      });
      await transaction.update(recurringJobs).set({
        status: "auto_paused",
        statusReason: "The spending limit cannot cover another run",
        pausedAt: now,
        nextRunAt: next.nextRunAt,
        missedRunCount: next.missedRuns > 0
          ? sql`${recurringJobs.missedRunCount} + ${next.missedRuns}`
          : context.job.missedRunCount,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now,
      }).where(and(
        eq(recurringJobs.id, jobId),
        eq(recurringJobs.leaseOwner, schedulerId)
      ));
      return { outcome: "skipped_limit" as const, task: null };
    }

    const [overlapping] = await transaction.select({ id: tasks.id })
      .from(tasks)
      .innerJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
      .where(and(
        eq(tasks.recurringJobId, jobId),
        inArray(taskPayments.status, [...UNSETTLED_PAYMENT_STATES])
      ))
      .limit(1);
    if (overlapping) {
      await transaction.insert(recurringJobOccurrences).values({
        recurringJobId: jobId,
        scheduledFor,
        status: "skipped_overlap",
        reason: "The previous paid run had not settled",
      });
      await advanceJob(
        transaction,
        context.job,
        next,
        now,
        next.missedRuns + 1,
        false
      );
      return { outcome: "skipped_overlap" as const, task: null };
    }

    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${context.walletId}))`
    );
    const task = await persistPaidTask(transaction, {
      userId: context.job.userId,
      userAgentId: context.job.userAgentId,
      walletId: context.walletId,
      title: context.job.name,
      prompt: context.job.instructions,
      priority: "normal",
      price: context.job.pricePerRun,
      recurringJobId: context.job.id,
      scheduledFor,
    });
    await transaction.insert(recurringJobOccurrences).values({
      recurringJobId: jobId,
      scheduledFor,
      status: "task_created",
      taskId: task.id,
    });
    await advanceJob(
      transaction,
      context.job,
      next,
      now,
      next.missedRuns,
      true
    );
    return { outcome: "task_created" as const, task };
  });
}

async function advanceJob(
  transaction: import("@/modules/tasks/application/persist-paid-task").DatabaseTransaction,
  job: typeof recurringJobs.$inferSelect,
  next: ReturnType<typeof advanceSchedule>,
  now: Date,
  missedRuns: number,
  createdTask: boolean
) {
  const completed = next.nextRunAt === null;
  await transaction.update(recurringJobs).set({
    status: completed ? "completed" : "active",
    nextRunAt: next.nextRunAt,
    lastRunAt: createdTask ? job.nextRunAt : job.lastRunAt,
    runCount: createdTask
      ? sql`${recurringJobs.runCount} + 1`
      : job.runCount,
    missedRunCount: missedRuns > 0
      ? sql`${recurringJobs.missedRunCount} + ${missedRuns}`
      : job.missedRunCount,
    completedAt: completed ? now : null,
    statusReason: completed ? "The schedule reached its end time" : null,
    leaseOwner: null,
    leaseExpiresAt: null,
    updatedAt: now,
  }).where(and(
    eq(recurringJobs.id, job.id),
    eq(recurringJobs.leaseOwner, job.leaseOwner!)
  ));
}
