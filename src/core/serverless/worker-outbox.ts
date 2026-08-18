import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { workerOutbox } from "@/db/schema";
import { db } from "@/lib/db";
import { wakeWorker, type WorkerRole } from "./qstash";

const OUTBOX_LEASE_MS = 2 * 60_000;
const MAX_RETRY_DELAY_MS = 15 * 60_000;

export type WorkerWakeRequest = Readonly<{
  role: WorkerRole;
  deduplicationKey: string;
  correlationId: string;
  reconciliation?: boolean;
  notBefore?: Date;
  delaySeconds?: number;
}>;

export async function requestWorkerWake(request: WorkerWakeRequest) {
  const now = new Date();
  const notBefore = request.notBefore ?? new Date(
    now.getTime() + Math.max(0, request.delaySeconds ?? 0) * 1_000
  );
  const [created] = await db.insert(workerOutbox).values({
    role: request.role,
    deduplicationKey: request.deduplicationKey,
    correlationId: request.correlationId,
    reconciliation: request.reconciliation ?? false,
    notBefore,
    nextAttemptAt: now,
  }).onConflictDoNothing({
    target: workerOutbox.deduplicationKey,
  }).returning({ id: workerOutbox.id });

  const [entry] = created ? [created] : await db.select({
    id: workerOutbox.id,
    status: workerOutbox.status,
  }).from(workerOutbox).where(
    eq(workerOutbox.deduplicationKey, request.deduplicationKey)
  ).limit(1);

  if (!entry || ("status" in entry && entry.status === "published")) {
    return { persisted: Boolean(entry), published: Boolean(entry) };
  }
  const result = await dispatchWorkerOutboxEntry(entry.id);
  return { persisted: true, published: result.published };
}

export async function dispatchWorkerOutbox(
  limit = 10,
  dispatcherId = `outbox-${randomUUID()}`
) {
  let published = 0;
  let pending = 0;
  for (let index = 0; index < limit; index += 1) {
    const id = await claimNextOutboxEntry(dispatcherId);
    if (!id) break;
    const result = await publishClaimedEntry(id, dispatcherId);
    if (result.published) published += 1;
    else pending += 1;
  }
  return { published, pending };
}

async function dispatchWorkerOutboxEntry(id: string) {
  const dispatcherId = `outbox-immediate-${randomUUID()}`;
  const claimed = await claimOutboxEntry(id, dispatcherId);
  return claimed
    ? publishClaimedEntry(id, dispatcherId)
    : { published: false };
}

async function claimNextOutboxEntry(dispatcherId: string) {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const [candidate] = await transaction.select({ id: workerOutbox.id })
      .from(workerOutbox)
      .where(and(
        inArray(workerOutbox.status, ["pending", "processing"]),
        lte(workerOutbox.nextAttemptAt, now),
        or(
          eq(workerOutbox.status, "pending"),
          isNull(workerOutbox.processingLeaseExpiresAt),
          lte(workerOutbox.processingLeaseExpiresAt, now)
        )
      ))
      .orderBy(asc(workerOutbox.nextAttemptAt), asc(workerOutbox.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!candidate) return null;
    const [claimed] = await transaction.update(workerOutbox).set({
      status: "processing",
      processingOwner: dispatcherId,
      processingLeaseExpiresAt: new Date(now.getTime() + OUTBOX_LEASE_MS),
      attemptCount: sql`${workerOutbox.attemptCount} + 1`,
      updatedAt: now,
    }).where(eq(workerOutbox.id, candidate.id)).returning({
      id: workerOutbox.id,
    });
    return claimed?.id ?? null;
  });
}

async function claimOutboxEntry(
  id: string,
  dispatcherId: string
) {
  const now = new Date();
  const [claimed] = await db.update(workerOutbox).set({
    status: "processing",
    processingOwner: dispatcherId,
    processingLeaseExpiresAt: new Date(now.getTime() + OUTBOX_LEASE_MS),
    attemptCount: sql`${workerOutbox.attemptCount} + 1`,
    updatedAt: now,
  }).where(and(
    eq(workerOutbox.id, id),
    inArray(workerOutbox.status, ["pending", "processing"]),
    or(
      eq(workerOutbox.status, "pending"),
      isNull(workerOutbox.processingLeaseExpiresAt),
      lte(workerOutbox.processingLeaseExpiresAt, now)
    )
  )).returning({ id: workerOutbox.id });
  return Boolean(claimed);
}

async function publishClaimedEntry(id: string, dispatcherId: string) {
  const [entry] = await db.select().from(workerOutbox).where(and(
    eq(workerOutbox.id, id),
    eq(workerOutbox.processingOwner, dispatcherId)
  )).limit(1);
  if (!entry) return { published: false };

  try {
    const result = await wakeWorker(entry.role, {
      notBefore: entry.notBefore,
      deduplicationId: entry.deduplicationKey,
      reconciliation: entry.reconciliation,
      correlationId: entry.correlationId,
    });
    if (!result.queued && result.reason === "beyond_free_delay") {
      await releaseForRetry(entry, dispatcherId, entry.notBefore, result.reason);
      return { published: false };
    }
    if (!result.queued) throw new Error("QStash is not configured");

    await db.update(workerOutbox).set({
      status: "published",
      publishedAt: new Date(),
      processingOwner: null,
      processingLeaseExpiresAt: null,
      lastError: null,
      updatedAt: new Date(),
    }).where(and(
      eq(workerOutbox.id, id),
      eq(workerOutbox.processingOwner, dispatcherId)
    ));
    return { published: true };
  } catch (error) {
    const delay = Math.min(
      2 ** Math.min(entry.attemptCount, 8) * 1_000,
      MAX_RETRY_DELAY_MS
    );
    await releaseForRetry(
      entry,
      dispatcherId,
      new Date(Date.now() + delay),
      error instanceof Error ? error.message : "Worker publish failed"
    );
    return { published: false };
  }
}

function releaseForRetry(
  entry: typeof workerOutbox.$inferSelect,
  dispatcherId: string,
  nextAttemptAt: Date,
  error: string
) {
  return db.update(workerOutbox).set({
    status: "pending",
    nextAttemptAt,
    processingOwner: null,
    processingLeaseExpiresAt: null,
    lastError: error.slice(0, 2_000),
    updatedAt: new Date(),
  }).where(and(
    eq(workerOutbox.id, entry.id),
    eq(workerOutbox.processingOwner, dispatcherId)
  ));
}
