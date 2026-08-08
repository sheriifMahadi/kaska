import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { agents, recurringJobs, taskPayments, tasks, userAgents } from "@/db/schema";
import { db } from "@/lib/db";

export async function getWorkforceActivity(userId: string) {
  const [spending, events, completedTasks] = await Promise.all([
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
    db.execute<{
      id: string;
      kind: "task" | "schedule";
      title: string;
      agentName: string;
      status: string;
      occurredAt: Date;
    }>(sql`
      select * from (
        select
          ${tasks.id}::text as id,
          'task'::text as kind,
          ${tasks.title} as title,
          ${agents.name} as "agentName",
          ${tasks.status} as status,
          coalesce(${tasks.completedAt}, ${tasks.failedAt}, ${tasks.startedAt}, ${tasks.updatedAt}) as "occurredAt"
        from ${tasks}
        inner join ${userAgents} on ${userAgents.id} = ${tasks.userAgentId}
          and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${tasks.userId} = ${userId}

        union all

        select
          ${recurringJobs.id}::text,
          'schedule'::text,
          ${recurringJobs.name},
          ${agents.name},
          ${recurringJobs.status},
          ${recurringJobs.updatedAt}
        from ${recurringJobs}
        inner join ${userAgents} on ${userAgents.id} = ${recurringJobs.userAgentId}
          and ${userAgents.userId} = ${userId}
        inner join ${agents} on ${agents.id} = ${userAgents.agentId}
        where ${recurringJobs.userId} = ${userId}
      ) activity
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
    events: [...events],
    completedTasks,
  };
}
