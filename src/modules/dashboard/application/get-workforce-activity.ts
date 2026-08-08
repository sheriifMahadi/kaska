import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import {
  agents,
  recurringJobOccurrences,
  recurringJobs,
  taskAttempts,
  taskOutputs,
  taskPaymentAttempts,
  taskPayments,
  tasks,
  userAgents,
  walletTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";

export async function getWorkforceActivity(userId: string) {
  const [spending, agentSpending, performance, events, completedTasks] =
    await Promise.all([
    db.execute<{ date: string; amount: string }>(sql`
      with days as (
        select generate_series(
          current_date - interval '29 days',
          current_date,
          interval '1 day'
        )::date as day
      ), charged as (
        select ${taskPayments.settledAt}::date as day, sum(${taskPayments.amount}) as amount
        from ${taskPayments}
        inner join ${tasks} on ${tasks.id} = ${taskPayments.taskId}
        where ${tasks.userId} = ${userId}
          and ${taskPayments.status} = 'charged'
          and ${taskPayments.settledAt} >= current_date - interval '29 days'
        group by ${taskPayments.settledAt}::date
      )
      select days.day::text as date, coalesce(charged.amount, 0)::text as amount
      from days left join charged on charged.day = days.day
      order by days.day
    `),
    db.select({
      date: sql<string>`${taskPayments.settledAt}::date::text`,
      agentId: agents.id,
      agentName: agents.name,
      amount: sql<string>`sum(${taskPayments.amount})::text`,
      taskCount: sql<number>`count(*)::int`,
    }).from(taskPayments)
      .innerJoin(tasks, eq(tasks.id, taskPayments.taskId))
      .innerJoin(userAgents, and(
        eq(userAgents.id, tasks.userAgentId),
        eq(userAgents.userId, userId)
      ))
      .innerJoin(agents, eq(agents.id, userAgents.agentId))
      .where(and(
        eq(tasks.userId, userId),
        eq(taskPayments.status, "charged"),
        sql`${taskPayments.settledAt} >= current_date - interval '29 days'`
      ))
      .groupBy(sql`${taskPayments.settledAt}::date`, agents.id, agents.name)
      .orderBy(sql`${taskPayments.settledAt}::date`),
    db.select({
      agentId: agents.id,
      agentName: agents.name,
      completed: sql<number>`count(distinct ${tasks.id}) filter (where ${tasks.status} = 'completed')::int`,
      failed: sql<number>`count(distinct ${tasks.id}) filter (where ${tasks.status} = 'failed')::int`,
      averageLatencyMs: sql<number | null>`round(avg(${taskOutputs.latencyMs}))::int`,
      averageCost: sql<string>`coalesce(avg(${taskPayments.amount}) filter (where ${taskPayments.status} = 'charged'), 0)::text`,
      totalTokens: sql<string>`coalesce(sum(${taskOutputs.tokens}), 0)::text`,
    }).from(userAgents)
      .innerJoin(agents, eq(agents.id, userAgents.agentId))
      .leftJoin(tasks, and(
        eq(tasks.userAgentId, userAgents.id),
        sql`${tasks.createdAt} >= current_date - interval '29 days'`
      ))
      .leftJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
      .leftJoin(taskOutputs, eq(taskOutputs.taskId, tasks.id))
      .where(eq(userAgents.userId, userId))
      .groupBy(agents.id, agents.name)
      .orderBy(agents.name),
    db.execute<{
      id: string;
      targetId: string;
      kind: "task" | "payment" | "schedule" | "transaction";
      title: string;
      agentName: string | null;
      eventType: string;
      status: string;
      occurredAt: Date;
    }>(sql`
      select * from (
        select ${taskAttempts.id}::text as id, ${tasks.id}::text as "targetId", 'task'::text as kind,
          ${tasks.title} as title, ${agents.name} as "agentName",
          'task_started'::text as "eventType", 'running'::text as status,
          ${taskAttempts.startedAt} as "occurredAt"
        from ${taskAttempts}
        inner join ${tasks} on ${tasks.id} = ${taskAttempts.taskId}
        inner join ${userAgents} on ${userAgents.id} = ${tasks.userAgentId} and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${tasks.userId} = ${userId}

        union all

        select ${taskAttempts.id}::text, ${tasks.id}::text, 'task'::text, ${tasks.title},
          ${agents.name}, 'task_finished'::text, ${taskAttempts.status},
          ${taskAttempts.endedAt}
        from ${taskAttempts}
        inner join ${tasks} on ${tasks.id} = ${taskAttempts.taskId}
        inner join ${userAgents} on ${userAgents.id} = ${tasks.userAgentId} and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${tasks.userId} = ${userId} and ${taskAttempts.endedAt} is not null

        union all

        select ${taskPaymentAttempts.id}::text, ${tasks.id}::text, 'payment'::text,
          ${tasks.title}, ${agents.name}, ${taskPaymentAttempts.kind},
          ${taskPaymentAttempts.status},
          coalesce(${taskPaymentAttempts.confirmedAt}, ${taskPaymentAttempts.failedAt}, ${taskPaymentAttempts.submittedAt}, ${taskPaymentAttempts.preparedAt})
        from ${taskPaymentAttempts}
        inner join ${tasks} on ${tasks.id} = ${taskPaymentAttempts.taskId}
        inner join ${userAgents} on ${userAgents.id} = ${tasks.userAgentId} and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${tasks.userId} = ${userId}

        union all

        select ${recurringJobs.id}::text, ${recurringJobs.id}::text, 'schedule'::text,
          ${recurringJobs.name}, ${agents.name}, 'schedule_state'::text,
          ${recurringJobs.status}, ${recurringJobs.updatedAt}
        from ${recurringJobs}
        inner join ${userAgents} on ${userAgents.id} = ${recurringJobs.userAgentId}
          and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${recurringJobs.userId} = ${userId}

        union all

        select ${recurringJobOccurrences.id}::text, ${recurringJobs.id}::text, 'schedule'::text,
          ${recurringJobs.name}, ${agents.name}, 'schedule_occurrence'::text,
          ${recurringJobOccurrences.status}, ${recurringJobOccurrences.createdAt}
        from ${recurringJobOccurrences}
        inner join ${recurringJobs} on ${recurringJobs.id} = ${recurringJobOccurrences.recurringJobId}
        inner join ${userAgents} on ${userAgents.id} = ${recurringJobs.userAgentId} and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${recurringJobs.userId} = ${userId}

        union all

        select ${walletTransactions.id}::text, ${walletTransactions.id}::text, 'transaction'::text,
          initcap(${walletTransactions.type}), null::text,
          ${walletTransactions.type}, ${walletTransactions.status},
          coalesce(${walletTransactions.confirmedAt}, ${walletTransactions.failedAt}, ${walletTransactions.createdAt})
        from ${walletTransactions}
        where ${walletTransactions.userId} = ${userId}

        union all

        select ${tasks.id}::text, ${tasks.id}::text, 'task'::text, ${tasks.title},
          ${agents.name}, 'task_state'::text, ${tasks.status}, ${tasks.updatedAt}
        from ${tasks}
        inner join ${userAgents} on ${userAgents.id} = ${tasks.userAgentId} and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${tasks.userId} = ${userId}
          and ${tasks.status} in ('cancelled', 'manual_review')
      ) activity
      where "occurredAt" is not null
      order by "occurredAt" desc
      limit 10
    `),
    db.select({
      id: tasks.id,
      title: tasks.title,
      agentName: agents.name,
      completedAt: tasks.completedAt,
      amount: taskPayments.amount,
    }).from(tasks)
      .innerJoin(userAgents, and(
        eq(userAgents.id, tasks.userAgentId),
        eq(userAgents.userId, userId)
      ))
      .innerJoin(agents, eq(agents.id, userAgents.agentId))
      .leftJoin(taskPayments, eq(taskPayments.taskId, tasks.id))
      .where(and(eq(tasks.userId, userId), eq(tasks.status, "completed")))
      .orderBy(desc(tasks.completedAt))
      .limit(10),
  ]);

  return {
    spending: [...spending],
    agentSpending,
    performance,
    events: [...events],
    completedTasks,
  };
}
