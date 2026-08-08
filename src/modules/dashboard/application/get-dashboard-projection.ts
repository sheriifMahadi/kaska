import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";

import {
  agents,
  recurringJobs,
  taskPayments,
  tasks,
  userAgents,
  walletLocks,
  wallets,
  walletTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";

export const getCurrentDashboardProjection = cache(async () => {
  const user = await requireCurrentUser();
  return getDashboardProjection(user.id);
});

export async function getDashboardProjection(userId: string) {
  const [walletRows, agentRows, taskRows, jobRows, recentTransactions, recentTasks] =
    await Promise.all([
      db.select({
        status: wallets.status,
        address: wallets.address,
        committed: sql<string>`coalesce(sum(${walletLocks.amount}) filter (where ${walletLocks.status} in ('RESERVED', 'ACTIVE')), 0)::text`,
      }).from(wallets)
        .leftJoin(walletLocks, eq(walletLocks.walletId, wallets.id))
        .where(eq(wallets.userId, userId))
        .groupBy(wallets.id),
      db.select({
        active: sql<number>`count(distinct ${userAgents.id}) filter (where ${userAgents.status} = 'active')::int`,
        totalCharged: sql<string>`coalesce(sum(${taskPayments.amount}) filter (where ${taskPayments.status} = 'charged'), 0)::text`,
      }).from(userAgents)
        .leftJoin(tasks, eq(tasks.userAgentId, userAgents.id))
        .leftJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
        .where(eq(userAgents.userId, userId)),
      db.select({
        total: sql<number>`count(*)::int`,
        draft: sql<number>`count(*) filter (where ${tasks.status} = 'draft')::int`,
        queued: sql<number>`count(*) filter (where ${tasks.status} = 'queued')::int`,
        running: sql<number>`count(*) filter (where ${tasks.status} = 'running')::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${tasks.status} = 'failed')::int`,
        cancelled: sql<number>`count(*) filter (where ${tasks.status} = 'cancelled')::int`,
        manualReview: sql<number>`count(*) filter (where ${tasks.status} = 'manual_review')::int`,
      }).from(tasks).where(eq(tasks.userId, userId)),
      db.select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${recurringJobs.status} = 'active')::int`,
        paused: sql<number>`count(*) filter (where ${recurringJobs.status} = 'paused')::int`,
        autoPaused: sql<number>`count(*) filter (where ${recurringJobs.status} = 'auto_paused')::int`,
      }).from(recurringJobs).where(eq(recurringJobs.userId, userId)),
      db.select({
        id: walletTransactions.id,
        type: walletTransactions.type,
        direction: walletTransactions.direction,
        status: walletTransactions.status,
        amount: walletTransactions.amount,
        txHash: walletTransactions.txHash,
        createdAt: walletTransactions.createdAt,
      }).from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10),
      db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
        agentName: agents.name,
        amount: taskPayments.amount,
        paymentStatus: taskPayments.status,
      }).from(tasks)
        .innerJoin(userAgents, and(
          eq(userAgents.id, tasks.userAgentId),
          eq(userAgents.userId, userId)
        ))
        .innerJoin(agents, eq(agents.id, userAgents.agentId))
        .leftJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
        .where(eq(tasks.userId, userId))
        .orderBy(desc(tasks.createdAt))
        .limit(10),
    ]);

  const wallet = walletRows[0] ?? null;
  const agentStats = agentRows[0] ?? { active: 0, totalCharged: "0" };
  const taskStats = taskRows[0] ?? emptyTaskStats;
  const jobStats = jobRows[0] ?? emptyJobStats;

  return {
    generatedAt: new Date().toISOString(),
    wallet: {
      status: wallet?.status ?? "missing",
      address: wallet?.address ?? null,
      committedUsdc: wallet?.committed ?? "0",
      totalUsdc: null,
      availableUsdc: null,
    },
    workforce: {
      activeAgents: agentStats.active,
      recurringJobs: jobStats,
    },
    tasks: taskStats,
    spending: {
      chargedUsdc: agentStats.totalCharged,
    },
    recent: {
      tasks: recentTasks,
      transactions: recentTransactions,
    },
  };
}

const emptyTaskStats = {
  total: 0,
  draft: 0,
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  manualReview: 0,
};
const emptyJobStats = { total: 0, active: 0, paused: 0, autoPaused: 0 };

export type DashboardProjection = Awaited<
  ReturnType<typeof getDashboardProjection>
>;
