import { NextResponse } from "next/server";
import { and, eq, gte, isNull } from "drizzle-orm";

import { securityEvents, wallets } from "@/db/schema";
import { db } from "@/lib/db";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { MAX_WALLET_PROVISIONING_ATTEMPTS } from
  "@/modules/identity/domain/wallet-provisioning-policy";
import { conflict } from "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

export async function POST() {
  try {
    const { user, wallet } = await requireCurrentWallet();

    if (wallet.status === "active") {
      throw conflict("Wallet is already active");
    }

    if (wallet.status === "pending") {
      return NextResponse.json(
        { status: "pending" },
        { status: 202 }
      );
    }

    if (
      wallet.provisioningAttempts <
        MAX_WALLET_PROVISIONING_ATTEMPTS ||
      wallet.nextProvisioningAttemptAt
    ) {
      throw conflict("Automatic wallet retry is still scheduled");
    }

    await db.transaction(async (transaction) => {
      const [resetWallet] = await transaction
        .update(wallets)
        .set({
          status: "pending",
          provisioningAttempts: 0,
          lastProvisioningError: null,
          provisioningStartedAt: null,
          nextProvisioningAttemptAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.id, wallet.id),
            eq(wallets.userId, user.id),
            eq(wallets.status, "failed"),
            gte(
              wallets.provisioningAttempts,
              MAX_WALLET_PROVISIONING_ATTEMPTS
            ),
            isNull(wallets.nextProvisioningAttemptAt)
          )
        )
        .returning({ id: wallets.id });

      if (!resetWallet) {
        throw conflict("Wallet state changed; refresh and try again");
      }

      await transaction.insert(securityEvents).values({
        userId: user.id,
        clerkId: user.clerkId,
        eventType: "wallet.manual_retry_requested",
        outcome: "success",
        metadata: {
          walletId: wallet.id,
          previousAttempts: wallet.provisioningAttempts,
        },
      });
    });

    return NextResponse.json(
      { status: "pending" },
      { status: 202 }
    );
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/retry");
  }
}
