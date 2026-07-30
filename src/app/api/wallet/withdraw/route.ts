import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { circle } from "@/lib/circle";
import {
  ARC_TESTNET,
  ARC_TESTNET_USDC,
} from "@/platform/blockchain/arc";

import {
  users,
  wallets,
} from "@/db/schema";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { recipient, amount } = await req.json();

  if (!recipient || !amount) {
    return NextResponse.json(
      { error: "Recipient and amount required" },
      { status: 400 }
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

  if (!wallet.address) {
    return NextResponse.json(
      { error: "Wallet is not active" },
      { status: 409 }
    );
  }

  try {
    const tx = await circle.createTransaction({
      blockchain: ARC_TESTNET,
      walletAddress: wallet.address,
      tokenAddress: ARC_TESTNET_USDC,
      destinationAddress: recipient,
      amount: [amount],
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM",
        },
      },
    });

    return NextResponse.json({
      transactionId: tx.data?.id,
      state: tx.data?.state,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Transfer failed",
      },
      {
        status: 500,
      }
    );
  }
}
