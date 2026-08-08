import { and, asc, eq, isNull, lte, or } from "drizzle-orm";

import { recurringJobs } from "@/db/schema";
import { db } from "@/lib/db";
import { scheduleLeaseExpiresAt } from
  "@/modules/schedules/domain/schedule";

export async function claimDueRecurringJob(
  schedulerId: string,
  now = new Date()
) {
  if (!schedulerId.trim()) throw new Error("Scheduler ID is required");
  return db.transaction(async (transaction) => {
    const [job] = await transaction
      .select()
      .from(recurringJobs)
      .where(and(
        eq(recurringJobs.status, "active"),
        lte(recurringJobs.startsAt, now),
        lte(recurringJobs.nextRunAt, now),
        or(
          isNull(recurringJobs.endsAt),
          lte(recurringJobs.nextRunAt, recurringJobs.endsAt)
        ),
        or(
          isNull(recurringJobs.leaseExpiresAt),
          lte(recurringJobs.leaseExpiresAt, now)
        )
      ))
      .orderBy(asc(recurringJobs.nextRunAt), asc(recurringJobs.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!job) return null;
    const leaseExpiresAt = scheduleLeaseExpiresAt(now);
    const [claimed] = await transaction.update(recurringJobs).set({
      leaseOwner: schedulerId,
      leaseExpiresAt,
      updatedAt: now,
    }).where(and(
      eq(recurringJobs.id, job.id),
      eq(recurringJobs.status, "active")
    )).returning();

    return claimed ?? null;
  });
}

export async function renewRecurringJobLease(
  jobId: string,
  schedulerId: string,
  now = new Date()
) {
  if (!schedulerId.trim()) throw new Error("Scheduler ID is required");
  const [renewed] = await db.update(recurringJobs).set({
    leaseExpiresAt: scheduleLeaseExpiresAt(now),
    updatedAt: now,
  }).where(and(
    eq(recurringJobs.id, jobId),
    eq(recurringJobs.status, "active"),
    eq(recurringJobs.leaseOwner, schedulerId)
  )).returning({ id: recurringJobs.id });
  return Boolean(renewed);
}

export async function releaseRecurringJobLease(
  jobId: string,
  schedulerId: string
) {
  if (!schedulerId.trim()) throw new Error("Scheduler ID is required");
  const [released] = await db.update(recurringJobs).set({
    leaseOwner: null,
    leaseExpiresAt: null,
    updatedAt: new Date(),
  }).where(and(
    eq(recurringJobs.id, jobId),
    eq(recurringJobs.leaseOwner, schedulerId)
  )).returning({ id: recurringJobs.id });
  return Boolean(released);
}

export async function deferRecurringJobLease(
  jobId: string,
  schedulerId: string,
  retryAt: Date
) {
  const [deferred] = await db.update(recurringJobs).set({
    leaseOwner: null,
    leaseExpiresAt: retryAt,
    updatedAt: new Date(),
  }).where(and(
    eq(recurringJobs.id, jobId),
    eq(recurringJobs.leaseOwner, schedulerId)
  )).returning({ id: recurringJobs.id });
  return Boolean(deferred);
}
