import { and, eq } from "drizzle-orm";

import { taskAttempts, tasks } from "@/db/schema";
import { db } from "@/lib/db";
import { renewTaskLease } from
  "@/modules/tasks/application/task-claims";
import { TASK_HEARTBEAT_INTERVAL_MS } from
  "@/modules/tasks/domain/task-lease";
import {
  decideTaskRetry,
  nextTaskAttemptAt,
} from "@/modules/tasks/domain/task-retry";
import { ProviderExecutionError } from "./providers/provider-error";
import { runTask } from "./run-task";

type ExecuteTaskInput = {
  taskId: string;
  attemptId: string;
  attemptNumber: number;
  maxAttempts: number;
  workerId: string;
};

export async function executeTask(input: ExecuteTaskInput) {
  const heartbeat = setInterval(() => {
    void renewTaskLease(input.taskId, input.workerId).catch((error) => {
      console.error(`Could not renew lease for task ${input.taskId}`, error);
    });
  }, TASK_HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  try {
    const result = await runTask(input.taskId);
    const now = new Date();

    await db.transaction(async (transaction) => {
      await transaction
        .update(taskAttempts)
        .set({
          status: "completed",
          provider: result.provider,
          requestedModel: result.requestedModel,
          model: result.model,
          latencyMs: result.latencyMs,
          endedAt: now,
        })
        .where(eq(taskAttempts.id, input.attemptId));

      await transaction
        .update(tasks)
        .set({
          status: "completed",
          completedAt: now,
          executionProvider: result.provider,
          executionModel: result.model,
          lastExecutionLatencyMs: result.latencyMs,
          leaseOwner: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(tasks.id, input.taskId),
            eq(tasks.status, "running"),
            eq(tasks.leaseOwner, input.workerId)
          )
        );
    });
  } catch (error) {
    await recordFailure(input, error);
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function recordFailure(input: ExecuteTaskInput, error: unknown) {
  const now = new Date();
  const providerError = error instanceof ProviderExecutionError ? error : null;
  const code = providerError?.code ?? "EXECUTION_FAILED";
  const message = error instanceof Error ? error.message : "Unknown error";
  const retry = decideTaskRetry(
    providerError?.retryable ?? false,
    input.attemptNumber,
    input.maxAttempts
  );

  await db.transaction(async (transaction) => {
    await transaction
      .update(taskAttempts)
      .set({
        status: "failed",
        provider: providerError?.provider,
        requestedModel: providerError?.requestedModel,
        latencyMs: providerError?.latencyMs,
        errorCode: code,
        errorMessage: message,
        retryable: retry.retry,
        endedAt: now,
      })
      .where(eq(taskAttempts.id, input.attemptId));

    await transaction
      .update(tasks)
      .set({
        status: retry.retry ? "queued" : "failed",
        failedAt: retry.retry ? null : now,
        nextAttemptAt: retry.retry
          ? nextTaskAttemptAt(now, retry.delayMs)
          : null,
        errorCode: code,
        error: message,
        executionProvider: providerError?.provider,
        lastExecutionLatencyMs: providerError?.latencyMs,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(tasks.id, input.taskId),
          eq(tasks.status, "running"),
          eq(tasks.leaseOwner, input.workerId)
        )
      );
  });
}
