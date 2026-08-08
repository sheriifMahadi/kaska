import "server-only";

import { desc, eq } from "drizzle-orm";
import {
  agents,
  taskPayments,
  tasks,
  userAgents,
} from "@/db/schema";
import { db } from "@/lib/db";
import { deriveTaskWorkflowState } from "../domain/task-workflow";

export async function listUserTasks(userId: string) {
  const rows = await db
    .select({
      id: tasks.id,
      escrowTaskId: tasks.escrowTaskId,
      title: tasks.title,
      prompt: tasks.prompt,
      priority: tasks.priority,
      status: tasks.status,
      paymentStatus: taskPayments.status,
      createdAt: tasks.createdAt,
      startedAt: tasks.startedAt,
      completedAt: tasks.completedAt,
      failedAt: tasks.failedAt,
      cancelledAt: tasks.cancelledAt,
      attemptCount: tasks.attemptCount,
      maxAttempts: tasks.maxAttempts,
      error: tasks.error,
      errorCode: tasks.errorCode,
      nextAttemptAt: tasks.nextAttemptAt,
      userAgentId: userAgents.id,
      agentId: agents.id,
      agentName: agents.name,
      agentType: agents.slug,
    })
    .from(tasks)
    .innerJoin(
      userAgents,
      eq(tasks.userAgentId, userAgents.id)
    )
    .innerJoin(
      agents,
      eq(userAgents.agentId, agents.id)
    )
    .leftJoin(
      taskPayments,
      eq(taskPayments.taskId, tasks.id)
    )
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));

  return rows.map((task) => ({
    ...task,
    workflowState: deriveTaskWorkflowState({
      executionStatus: task.status,
      paymentStatus: task.paymentStatus,
      attemptCount: task.attemptCount,
    }),
  }));
}
