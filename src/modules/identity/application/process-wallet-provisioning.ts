import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  eq,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { securityEvents, users, wallets } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";

import { provisionCircleWallet } from "./provision-circle-wallet";
import {
  MAX_WALLET_PROVISIONING_ATTEMPTS,
  nextWalletProvisioningAttempt,
} from "@/modules/identity/domain/wallet-provisioning-policy";

const LEASE_DURATION_MS = 5 * 60 * 1_000;

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : "Unknown Circle provisioning error";
}

export async function processWalletProvisioningQueue(limit = 5) {
  const now = new Date();
  const staleLease = new Date(now.getTime() - LEASE_DURATION_MS);
  const candidates = await db
    .select({ walletId: wallets.id })
    .from(wallets)
    .innerJoin(users, eq(users.id, wallets.userId))
    .where(
      and(
        eq(users.status, "active"),
        lt(
          wallets.provisioningAttempts,
          MAX_WALLET_PROVISIONING_ATTEMPTS
        ),
        or(
          eq(wallets.status, "pending"),
          and(
            eq(wallets.status, "failed"),
            or(
              isNull(wallets.nextProvisioningAttemptAt),
              lte(wallets.nextProvisioningAttemptAt, now)
            )
          )
        ),
        or(
          isNull(wallets.provisioningStartedAt),
          lt(wallets.provisioningStartedAt, staleLease)
        )
      )
    )
    .orderBy(asc(wallets.createdAt))
    .limit(limit);

  for (const candidate of candidates) {
    await processWalletProvisioning(candidate.walletId);
  }

  return candidates.length;
}

export async function processWalletProvisioning(walletId: string) {
  const now = new Date();
  const staleLease = new Date(now.getTime() - LEASE_DURATION_MS);
  const [claimed] = await db
    .update(wallets)
    .set({
      provisioningStartedAt: now,
      provisioningAttempts: sql`${wallets.provisioningAttempts} + 1`,
      lastProvisioningError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(wallets.id, walletId),
        lt(
          wallets.provisioningAttempts,
          MAX_WALLET_PROVISIONING_ATTEMPTS
        ),
        or(
          eq(wallets.status, "pending"),
          eq(wallets.status, "failed")
        ),
        or(
          isNull(wallets.provisioningStartedAt),
          lt(wallets.provisioningStartedAt, staleLease)
        )
      )
    )
    .returning();

  if (!claimed) {
    return false;
  }

  const [owner] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, claimed.userId))
    .limit(1);

  if (owner?.status !== "active") {
    await db
      .update(wallets)
      .set({
        provisioningStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, claimed.id));

    return false;
  }

  const circleRequestIds: string[] = [];

  try {
    const result = await provisionCircleWallet({
      userId: claimed.userId,
      walletSetId: claimed.circleWalletSetId,
      walletSetIdempotencyKey: claimed.walletSetIdempotencyKey,
      walletIdempotencyKey: claimed.walletIdempotencyKey,
      circle,
      createRequestId: randomUUID,
      recordRequestId: async (requestId) => {
        circleRequestIds.push(requestId);
        await db
          .update(wallets)
          .set({
            lastCircleRequestId: requestId,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, claimed.id));
      },
      persistWalletSetId: async (circleWalletSetId) => {
        await db
          .update(wallets)
          .set({
            circleWalletSetId,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, claimed.id));
      },
    });

    await db.transaction(async (transaction) => {
      await transaction
        .update(wallets)
        .set({
          circleWalletId: result.wallet.id,
          circleWalletSetId: result.wallet.walletSetId,
          address: result.wallet.address,
          status: "active",
          lastProvisioningError: null,
          provisioningStartedAt: null,
          nextProvisioningAttemptAt: null,
          provisionedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, claimed.id));

      await transaction.insert(securityEvents).values({
        userId: claimed.userId,
        eventType: result.reconciled
          ? "wallet.provisioning_reconciled"
          : "wallet.provisioning_succeeded",
        outcome: "success",
        metadata: {
          walletId: claimed.id,
          provisioningAttempt: claimed.provisioningAttempts,
          circleRequestIds,
        },
      });
    });

    return true;
  } catch (error) {
    const failedAt = new Date();
    const nextAttempt = nextWalletProvisioningAttempt(
      claimed.provisioningAttempts,
      failedAt
    );

    await db.transaction(async (transaction) => {
      await transaction
        .update(wallets)
        .set({
          status: "failed",
          lastProvisioningError: errorMessage(error),
          provisioningStartedAt: null,
          nextProvisioningAttemptAt: nextAttempt,
          updatedAt: failedAt,
        })
        .where(eq(wallets.id, claimed.id));

      await transaction.insert(securityEvents).values({
        userId: claimed.userId,
        eventType: "wallet.provisioning_failed",
        outcome: "failure",
        metadata: {
          walletId: claimed.id,
          provisioningAttempt: claimed.provisioningAttempts,
          circleRequestIds,
          automaticRetryScheduled: Boolean(nextAttempt),
        },
      });
    });

    return false;
  }
}
