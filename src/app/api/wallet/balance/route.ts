import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { circle } from "@/lib/circle";
import { users, wallets } from "@/db/schema";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .then((r) => r[0]);

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found" },
      { status: 404 }
    );
  }

  const balanceResponse = await circle.getWalletTokenBalance({
    id: wallet.circleWalletId,
  });

  const usdc = balanceResponse.data?.tokenBalances.find(
    (tokenBalance) =>
      tokenBalance.token.symbol === "USDC" &&
      tokenBalance.token.standard === "ERC20"
  );

  const totalBalance = usdc?.amount ?? "0";

  return NextResponse.json({
    address: wallet.address,
    walletId: wallet.circleWalletId,
    totalBalance,
    availableBalance: totalBalance,
    lockedBalance: "0",
    currency: "USDC",
  });
}