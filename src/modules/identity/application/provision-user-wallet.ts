import "server-only";

import { eq } from "drizzle-orm";
import { users, wallets } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";

export type ProvisionUserWalletInput = {
  clerkId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

export async function provisionUserWallet(
  input: ProvisionUserWalletInput
) {
  const [user] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        name: input.name,
        imageUrl: input.imageUrl,
      },
    })
    .returning();

  const [existingWallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .limit(1);

  if (existingWallet) {
    return existingWallet;
  }

  const walletSetResponse = await circle.createWalletSet({
    name: `kaska-${user.id}`,
  });
  const walletSetId =
    walletSetResponse.data?.walletSet?.id;

  if (!walletSetId) {
    throw new Error("Circle wallet-set creation failed");
  }

  const walletResponse = await circle.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  });
  const circleWallet = walletResponse.data?.wallets?.[0];

  if (!circleWallet) {
    throw new Error("Circle wallet creation failed");
  }

  const [wallet] = await db
    .insert(wallets)
    .values({
      userId: user.id,
      circleWalletId: circleWallet.id,
      circleWalletSetId: circleWallet.walletSetId,
      address: circleWallet.address,
      status: "active",
    })
    .onConflictDoNothing({
      target: wallets.userId,
    })
    .returning();

  if (wallet) {
    return wallet;
  }

  const [concurrentlyCreatedWallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, user.id))
    .limit(1);

  if (!concurrentlyCreatedWallet) {
    throw new Error("Wallet persistence failed");
  }

  return concurrentlyCreatedWallet;
}

