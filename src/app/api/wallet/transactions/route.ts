import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { walletTransactions } from "@/db/schema";
import { db } from "@/lib/db";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { user } = await requireCurrentWallet();
    const transactions = await db
      .select({
        id: walletTransactions.id,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        status: walletTransactions.status,
        amount: walletTransactions.amount,
        currency: walletTransactions.currency,
        circleTransactionId:
          walletTransactions.circleTransactionId,
        txHash: walletTransactions.txHash,
        source: walletTransactions.source,
        createdAt: walletTransactions.createdAt,
        confirmedAt: walletTransactions.confirmedAt,
        failedAt: walletTransactions.failedAt,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id))
      .orderBy(desc(walletTransactions.createdAt));

    return NextResponse.json(transactions);
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/transactions");
  }
}
