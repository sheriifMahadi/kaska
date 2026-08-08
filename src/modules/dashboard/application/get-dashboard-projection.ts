import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import {
  recurringJobs,
  tasks,
  userAgents,
  walletTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { getWalletBalance } from
  "@/modules/wallets/application/get-wallet-balance";
import { getWorkforceActivity } from "./get-workforce-activity";

type User = { id: string; name: string | null; email: string };
type Wallet = {
  id: string;
  status: string;
  address: string | null;
  circleWalletId: string | null;
};

const BALANCE_CACHE_MS = 60_000;
const balanceCache = new Map<string, {
  expiresAt: number;
  value: Awaited<ReturnType<typeof getWalletBalance>>;
}>();

export async function getDashboardProjection(user: User, wallet: Wallet) {
  const [workforceActivity, workforceRows, taskRows, scheduleRows, transactions, balance] =
    await Promise.all([
      getWorkforceActivity(user.id),
      db.select({
        activeAgents: sql<number>`count(*) filter (where ${userAgents.status} = 'active')::int`,
      }).from(userAgents).where(eq(userAgents.userId, user.id)),
      db.select({
        pending: sql<number>`count(*) filter (where ${tasks.status} in ('draft', 'queued'))::int`,
        running: sql<number>`count(*) filter (where ${tasks.status} = 'running')::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${tasks.status} = 'failed')::int`,
        manualReview: sql<number>`count(*) filter (where ${tasks.status} = 'manual_review')::int`,
      }).from(tasks).where(eq(tasks.userId, user.id)),
      db.select({
        active: sql<number>`count(*) filter (where ${recurringJobs.status} = 'active')::int`,
        paused: sql<number>`count(*) filter (where ${recurringJobs.status} = 'paused')::int`,
        autoPaused: sql<number>`count(*) filter (where ${recurringJobs.status} = 'auto_paused')::int`,
      }).from(recurringJobs).where(eq(recurringJobs.userId, user.id)),
      db.select({
        id: walletTransactions.id,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        status: walletTransactions.status,
        amount: walletTransactions.amount,
        txHash: walletTransactions.txHash,
        createdAt: walletTransactions.createdAt,
      }).from(walletTransactions)
        .where(eq(walletTransactions.userId, user.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10),
      loadAvailableBalance(wallet),
    ]);

  const workforce = workforceRows[0] ?? { activeAgents: 0 };
  const taskCounts = taskRows[0] ?? {
    pending: 0, running: 0, completed: 0, failed: 0, manualReview: 0,
  };
  const schedules = scheduleRows[0] ?? {
    active: 0, paused: 0, autoPaused: 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    user,
    wallet: { status: wallet.status, address: wallet.address },
    sidebar: {
      availableUsdc: balance.value,
      balanceStatus: balance.status,
      activeAgents: workforce.activeAgents,
    },
    overview: {
      tasks: taskCounts,
      schedules,
    },
    workforceActivity,
    transactions,
  };
}

async function loadAvailableBalance(wallet: Wallet) {
  if (wallet.status !== "active" || !wallet.circleWalletId) {
    return { status: "unavailable" as const, value: null };
  }
  const cached = balanceCache.get(wallet.id);
  if (cached && cached.expiresAt > Date.now()) {
    return { status: "available" as const, value: cached.value.availableBalance };
  }
  try {
    const value = await getWalletBalance({
      walletId: wallet.id,
      circleWalletId: wallet.circleWalletId,
    });
    balanceCache.set(wallet.id, {
      expiresAt: Date.now() + BALANCE_CACHE_MS,
      value,
    });
    return { status: "available" as const, value: value.availableBalance };
  } catch (error) {
    console.error("Dashboard available balance unavailable", error);
    return { status: "unavailable" as const, value: null };
  }
}
