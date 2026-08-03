import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  walletTransactions,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { user, wallet } = await requireCurrentWallet();
    const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, user.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },

      wallet: {
        status: wallet.status,
        address: wallet.address,
      },

      balance: {
        amount: "0.00",
        currency: "USDC",
      },

      stats: {
        workers: 0,
        tasks: 0,
        monthlySpend: 0,
      },

      transactions,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/dashboard");
  }
}
