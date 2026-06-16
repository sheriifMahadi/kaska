import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  wallets,
  walletTransactions,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Find Kaska user
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Wallet
  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, dbUser.id))
    .then((r) => r[0]);

  // Transactions
  const transactions = wallet
    ? await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10)
    : [];

  return NextResponse.json({
    user: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
    },

    wallet: wallet ?? null,

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
}