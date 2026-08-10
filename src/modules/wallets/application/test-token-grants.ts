import { randomUUID } from "node:crypto";

import { and, eq, isNull, lt, lte, or, sql } from "drizzle-orm";

import { testTokenGrants, wallets } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import { serverConfig } from "@/platform/config/server";
import { conflict, notFound } from "@/shared/errors/application-error";

const GRANT_AMOUNT = "1.000000";
const LEASE_MS = 60_000;
const POLL_MS = 5_000;

export async function getTestTokenGrant(userId: string) {
  const [grant] = await db
    .select({
      status: testTokenGrants.status,
      error: testTokenGrants.error,
      completedAt: testTokenGrants.completedAt,
    })
    .from(testTokenGrants)
    .where(eq(testTokenGrants.userId, userId))
    .limit(1);
  return grant ?? null;
}

export async function claimTestToken(userId: string) {
  if (!serverConfig.testTokenClaimsEnabled) {
    throw notFound("Test-token claims are unavailable");
  }

  return db.transaction(async (tx) => {
    const [wallet] = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (
      !wallet || wallet.status !== "active" ||
      !wallet.circleWalletId || !wallet.address
    ) {
      throw conflict("Your Kaska wallet is not ready yet");
    }

    const [created] = await tx
      .insert(testTokenGrants)
      .values({ userId, walletId: wallet.id, amount: GRANT_AMOUNT })
      .onConflictDoNothing({ target: testTokenGrants.userId })
      .returning({ status: testTokenGrants.status });

    if (created) return created;

    const [existing] = await tx
      .select()
      .from(testTokenGrants)
      .where(eq(testTokenGrants.userId, userId))
      .limit(1);

    if (!existing) throw new Error("Could not reserve the test-token claim");
    if (existing.status !== "failed") {
      return { status: existing.status };
    }

    const [retried] = await tx
      .update(testTokenGrants)
      .set({
        status: "pending",
        idempotencyKey: randomUUID(),
        circleTransactionId: null,
        txHash: null,
        error: null,
        nextAttemptAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        submittedAt: null,
        completedAt: null,
        failedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(testTokenGrants.id, existing.id),
          eq(testTokenGrants.status, "failed")
        )
      )
      .returning({ status: testTokenGrants.status });

    return retried ?? { status: "pending" as const };
  });
}

export async function processTestTokenGrants(workerId: string, limit = 5) {
  if (!serverConfig.testTokenClaimsEnabled) return 0;

  for (let index = 0; index < limit; index += 1) {
    const grant = await claimNextGrant(workerId);
    if (!grant) return index;
    await processGrant(grant, workerId);
  }
  return limit;
}

async function claimNextGrant(workerId: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ id: testTokenGrants.id })
      .from(testTokenGrants)
      .where(
        and(
          eq(testTokenGrants.status, "pending"),
          lte(testTokenGrants.nextAttemptAt, now),
          or(
            isNull(testTokenGrants.leaseExpiresAt),
            lt(testTokenGrants.leaseExpiresAt, now)
          )
        )
      )
      .limit(1)
      .for("update", { skipLocked: true });

    if (!candidate) return null;
    const [claimed] = await tx
      .update(testTokenGrants)
      .set({
        leaseOwner: workerId,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        attempts: sql`${testTokenGrants.attempts} + 1`,
        updatedAt: now,
      })
      .where(eq(testTokenGrants.id, candidate.id))
      .returning();
    return claimed ?? null;
  });
}

async function processGrant(
  grant: typeof testTokenGrants.$inferSelect,
  workerId: string
) {
  try {
    let transactionId = grant.circleTransactionId;
    if (!transactionId) {
      const sourceWalletId = serverConfig.testTokenSourceWalletId;
      const [sourceBalance, destination] = await Promise.all([
        circle.getWalletTokenBalance({ id: sourceWalletId }),
        db.select({ address: wallets.address })
          .from(wallets)
          .where(eq(wallets.id, grant.walletId))
          .limit(1),
      ]);
      const usdc = sourceBalance.data?.tokenBalances?.find(
        ({ token }) => token.symbol?.toUpperCase() === "USDC" &&
          token.blockchain === "ARC-TESTNET"
      );
      const destinationAddress = destination[0]?.address;
      if (!usdc?.token.id) throw new Error("Distribution wallet has no Arc Testnet USDC");
      if (!destinationAddress) throw new Error("Destination wallet address is unavailable");

      const response = await circle.createTransaction({
        walletId: sourceWalletId,
        tokenId: usdc.token.id,
        destinationAddress,
        amount: [GRANT_AMOUNT],
        idempotencyKey: grant.idempotencyKey,
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });
      const createdTransactionId = response.data?.id;
      if (!createdTransactionId) {
        throw new Error("Circle returned no transaction ID");
      }
      transactionId = createdTransactionId;

      await updateClaimedGrant(grant.id, workerId, {
        circleTransactionId: transactionId,
        submittedAt: new Date(),
        error: null,
        nextAttemptAt: new Date(Date.now() + POLL_MS),
      });
      return;
    }

    const response = await circle.getTransaction({ id: transactionId });
    const remote = response.data?.transaction;
    if (!remote) throw new Error("Circle returned no transaction");
    const now = new Date();

    if (["COMPLETE", "CONFIRMED"].includes(remote.state)) {
      await updateClaimedGrant(grant.id, workerId, {
        status: "completed",
        txHash: remote.txHash ?? null,
        completedAt: remote.firstConfirmDate
          ? new Date(remote.firstConfirmDate)
          : now,
        error: null,
      });
      return;
    }

    if (["FAILED", "DENIED", "CANCELLED", "STUCK"].includes(remote.state)) {
      await updateClaimedGrant(grant.id, workerId, {
        status: "failed",
        error: [remote.errorReason, remote.errorDetails]
          .filter(Boolean).join(": ") || remote.state,
        failedAt: now,
      });
      return;
    }

    await updateClaimedGrant(grant.id, workerId, {
      error: null,
      nextAttemptAt: new Date(now.getTime() + POLL_MS),
    });
  } catch (error) {
    await updateClaimedGrant(grant.id, workerId, {
      error: error instanceof Error
        ? error.message.slice(0, 2_000)
        : "Test-token transfer failed",
      nextAttemptAt: new Date(Date.now() + 30_000),
    });
  }
}

type GrantUpdate = Partial<typeof testTokenGrants.$inferInsert>;

function updateClaimedGrant(id: string, workerId: string, values: GrantUpdate) {
  return db
    .update(testTokenGrants)
    .set({
      ...values,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(testTokenGrants.id, id),
        eq(testTokenGrants.status, "pending"),
        eq(testTokenGrants.leaseOwner, workerId)
      )
    );
}
