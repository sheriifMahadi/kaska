import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { circle } from "@/lib/circle";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. get internal user
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 2. check wallet
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, dbUser.id))
    .then((r) => r[0]);

  if (existing) {
    return NextResponse.json({
      exists: true,
      wallet: existing,
    });
  }

  // 3. create Circle wallet
  const walletSetResponse = await circle.createWalletSet({
    name: `kaska-${userId}`,
  });

  const walletSet = walletSetResponse.data?.walletSet

  if (!walletSet?.id) {
    return NextResponse.json(
      { error: "Wallet set creation failed" },
      { status: 500 }
    );
  }

  // 4. 
  const walletResponse = await circle.createWallets({
    walletSetId: walletSet.id,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA"
  });
  const wallet = walletResponse.data?.wallets?.[0];
  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet creation failed" },
      { status: 500 }
    );
  }
  // 5. store in DB
  const created = await db
    .insert(wallets)
    .values({
      userId: dbUser.id,
      circleWalletId: wallet.id,
      circleWalletSetId: wallet.walletSetId,
      address: wallet.address,
      status: "active",
    })
    .returning();

  return NextResponse.json({
    exists: false,
    wallet: created[0],
  });

}