import "server-only";

import { eq } from "drizzle-orm";
import { isAddress, type Address } from "viem";

import { wallets } from "@/db/schema";
import { db } from "@/lib/db";
import {
  conflict,
  notFound,
} from "@/shared/errors/application-error";

import { requireCurrentUser } from "./current-user";

export async function requireUserWallet(userId: string) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (!wallet) {
    throw notFound("Wallet not found");
  }

  return wallet;
}

export async function requireCurrentWallet() {
  const user = await requireCurrentUser();
  const wallet = await requireUserWallet(user.id);

  return { user, wallet };
}

export async function requireActiveUserWallet(userId: string) {
  const wallet = await requireUserWallet(userId);

  if (
    wallet.status !== "active" ||
    !wallet.circleWalletId ||
    !wallet.address ||
    !isAddress(wallet.address)
  ) {
    throw conflict("Wallet is not active");
  }

  return wallet as typeof wallet & {
    circleWalletId: string;
    address: Address;
  };
}

export async function requireActiveCurrentWallet() {
  const user = await requireCurrentUser();
  const wallet = await requireActiveUserWallet(user.id);

  return { user, wallet };
}
