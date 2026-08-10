import "server-only";

import { and, desc, eq } from "drizzle-orm";

import {
  agents,
  recurringJobOccurrences,
  recurringJobs,
  taskPayments,
  tasks,
  userAgents,
} from "@/db/schema";
import { db } from "@/lib/db";
import { hasAgentExecutionProfile } from
  "@/core/execution/agent-execution-profiles";
import { requireActiveUserWallet } from
  "@/modules/identity/application/current-wallet";
import { parsePositiveUsdc, parseUsdc } from
  "@/modules/payments/domain/usdc";
import {
  canTransitionRecurringJob,
  parseRecurringJobInput,
  recurringBudgetAllowsRun,
  validateRecurringJobPrice,
  type RecurringJobStatus,
} from "@/modules/schedules/domain/recurring-job";
import { calculateFirstRun } from
  "@/modules/schedules/domain/schedule";
import { conflict, notFound } from
  "@/shared/errors/application-error";

export async function createRecurringJob(userId: string, raw: unknown) {
  const input = parseRecurringJobInput(raw);
  await requireActiveUserWallet(userId);
  const [employment] = await db.select({
    status: userAgents.status,
    agentActive: agents.isActive,
    agentSlug: agents.slug,
    supportsRecurring: agents.supportsRecurring,
    price: agents.price,
  }).from(userAgents)
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(and(
      eq(userAgents.id, input.userAgentId),
      eq(userAgents.userId, userId)
    ))
    .limit(1);
  if (!employment) throw notFound("Employed agent not found");
  if (
    employment.status !== "active" ||
    !employment.agentActive ||
    !hasAgentExecutionProfile(employment.agentSlug) ||
    !employment.supportsRecurring
  ) throw conflict("This agent cannot accept recurring work");

  const amounts = validateRecurringJobPrice(
    input.spendingLimit,
    employment.price
  );
  const now = new Date();
  const schedule = calculateFirstRun({
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    intervalMinutes: input.intervalMinutes,
    now,
  });
  if (!schedule.nextRunAt) throw conflict("The schedule has already ended");

  const [job] = await db.insert(recurringJobs).values({
    userId,
    userAgentId: input.userAgentId,
    name: input.name,
    instructions: input.instructions,
    intervalMinutes: input.intervalMinutes,
    pricePerRun: amounts.pricePerRun,
    spendingLimit: amounts.spendingLimit,
    timezone: input.timezone,
    startsAt: input.startsAt ?? now,
    endsAt: input.endsAt,
    nextRunAt: schedule.nextRunAt,
    missedRunCount: schedule.missedRuns,
  }).returning();
  return job;
}

export function listRecurringJobs(userId: string) {
  return db.select({
    id: recurringJobs.id,
    userAgentId: recurringJobs.userAgentId,
    name: recurringJobs.name,
    instructions: recurringJobs.instructions,
    status: recurringJobs.status,
    intervalMinutes: recurringJobs.intervalMinutes,
    pricePerRun: recurringJobs.pricePerRun,
    spendingLimit: recurringJobs.spendingLimit,
    spentAmount: recurringJobs.spentAmount,
    runCount: recurringJobs.runCount,
    consecutiveFailures: recurringJobs.consecutiveFailures,
    missedRunCount: recurringJobs.missedRunCount,
    timezone: recurringJobs.timezone,
    nextRunAt: recurringJobs.nextRunAt,
    lastRunAt: recurringJobs.lastRunAt,
    statusReason: recurringJobs.statusReason,
    createdAt: recurringJobs.createdAt,
    agentName: agents.name,
    agentSlug: agents.slug,
  }).from(recurringJobs)
    .innerJoin(userAgents, eq(userAgents.id, recurringJobs.userAgentId))
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(eq(recurringJobs.userId, userId))
    .orderBy(desc(recurringJobs.createdAt));
}

export async function getRecurringJob(userId: string, id: string) {
  const [job] = await db.select({
    job: recurringJobs,
    agentName: agents.name,
    agentSlug: agents.slug,
  }).from(recurringJobs)
    .innerJoin(userAgents, eq(userAgents.id, recurringJobs.userAgentId))
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(and(eq(recurringJobs.id, id), eq(recurringJobs.userId, userId)))
    .limit(1);
  if (!job) throw notFound("Recurring job not found");
  const occurrences = await db.select({
    id: recurringJobOccurrences.id,
    scheduledFor: recurringJobOccurrences.scheduledFor,
    status: recurringJobOccurrences.status,
    reason: recurringJobOccurrences.reason,
    taskId: recurringJobOccurrences.taskId,
    taskStatus: tasks.status,
    paymentStatus: taskPayments.status,
    createdAt: recurringJobOccurrences.createdAt,
  }).from(recurringJobOccurrences)
    .leftJoin(tasks, eq(tasks.id, recurringJobOccurrences.taskId))
    .leftJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
    .where(eq(recurringJobOccurrences.recurringJobId, id))
    .orderBy(desc(recurringJobOccurrences.scheduledFor))
    .limit(50);
  return { ...job, occurrences };
}

export async function updateRecurringJob(
  userId: string,
  id: string,
  input: { status?: RecurringJobStatus; spendingLimit?: string }
) {
  return db.transaction(async (transaction) => {
    const [job] = await transaction.select().from(recurringJobs)
      .where(and(eq(recurringJobs.id, id), eq(recurringJobs.userId, userId)))
      .limit(1)
      .for("update");
    if (!job) throw notFound("Recurring job not found");

    let spendingLimit = job.spendingLimit;
    if (input.spendingLimit !== undefined) {
      spendingLimit = parsePositiveUsdc(input.spendingLimit).decimal;
      const minimum = parseUsdc(job.spentAmount).microUsdc +
        parseUsdc(job.pricePerRun).microUsdc;
      if (parseUsdc(spendingLimit).microUsdc < minimum) {
        throw conflict("The new limit must cover spending so far and one more run");
      }
    }

    let status = job.status;
    const now = new Date();
    const update: Partial<typeof recurringJobs.$inferInsert> = {
      spendingLimit,
      updatedAt: now,
    };
    if (input.status && input.status !== job.status) {
      if (!canTransitionRecurringJob(job.status, input.status)) {
        throw conflict(`A ${job.status} job cannot become ${input.status}`);
      }
      status = input.status;
      if (status === "active") {
        if (!recurringBudgetAllowsRun(
          job.spentAmount,
          spendingLimit,
          job.pricePerRun
        )) throw conflict("Increase the spending limit before resuming");
        const schedule = calculateFirstRun({
          startsAt: job.nextRunAt ?? now,
          endsAt: job.endsAt,
          intervalMinutes: job.intervalMinutes,
          now,
        });
        if (!schedule.nextRunAt) throw conflict("This schedule has ended");
        update.nextRunAt = schedule.nextRunAt;
        update.statusReason = null;
        update.pausedAt = null;
      } else if (status === "paused") {
        update.pausedAt = now;
        update.statusReason = "Paused by the user";
      } else if (status === "cancelled") {
        update.cancelledAt = now;
        update.nextRunAt = null;
        update.statusReason = "Cancelled by the user";
      }
      update.status = status;
      update.leaseOwner = null;
      update.leaseExpiresAt = null;
    }

    const [saved] = await transaction.update(recurringJobs).set(update)
      .where(and(eq(recurringJobs.id, id), eq(recurringJobs.userId, userId)))
      .returning();
    return saved;
  });
}
