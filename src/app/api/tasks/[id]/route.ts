import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  tasks,
  taskAttempts,
  taskOutputs,
  userAgents,
  agents,
  taskPayments,
  taskPaymentAttempts,
} from "@/db/schema";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { errorResponse } from "@/shared/http/error-response";
import { cancelTask } from
  "@/modules/tasks/application/cancel-task";
import { invalidInput } from
  "@/shared/errors/application-error";
import { retryTask } from
  "@/modules/tasks/application/retry-task";
import { parseTaskId } from
  "@/modules/tasks/domain/task-id";
import { deriveTaskWorkflowState } from
  "@/modules/tasks/domain/task-workflow";
import {
  wakeDeduplicationId,
  wakeWorkerSafely,
} from "@/core/serverless/qstash";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  try {
    const id = parseTaskId((await params).id);
    const user = await requireCurrentUser();

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        prompt: tasks.prompt,
        priority: tasks.priority,
        status: tasks.status,

        createdAt: tasks.createdAt,
        startedAt: tasks.startedAt,
        completedAt: tasks.completedAt,
        failedAt: tasks.failedAt,
        cancelledAt: tasks.cancelledAt,
        nextAttemptAt: tasks.nextAttemptAt,
        attemptCount: tasks.attemptCount,
        maxAttempts: tasks.maxAttempts,
        error: tasks.error,
        errorCode: tasks.errorCode,
        executionProvider: tasks.executionProvider,
        executionModel: tasks.executionModel,
        latencyMs: tasks.lastExecutionLatencyMs,

        agentName: agents.name,
        agentType: agents.slug,

        output: taskOutputs.output,
        requestedModel: taskOutputs.requestedModel,
        model: taskOutputs.model,
        tokens: taskOutputs.tokens,
        inputTokens: taskOutputs.inputTokens,
        outputTokens: taskOutputs.outputTokens,
        finishReason: taskOutputs.finishReason,
        webSearchRequests: taskOutputs.webSearchRequests,
        citations: taskOutputs.citations,
        outputFormat: taskOutputs.format,
        cost: taskOutputs.cost,

        paymentStatus: taskPayments.status,
        paymentAmount: taskPayments.amount,
        paymentError: taskPayments.error,
        paymentErrorCode: taskPayments.errorCode,
        approvalTxHash: taskPayments.approvalTxHash,
        escrowTxHash: taskPayments.escrowTxHash,
        settlementTxHash: taskPayments.settlementTxHash,
        lockedAt: taskPayments.lockedAt,
        settledAt: taskPayments.settledAt,
      })
      .from(tasks)
      .leftJoin(
        taskOutputs,
        eq(taskOutputs.taskId, tasks.id)
      )
      .leftJoin(
        taskPayments,
        eq(taskPayments.taskId, tasks.id)
      )
      .innerJoin(
        userAgents,
        eq(userAgents.id, tasks.userAgentId)
      )
      .innerJoin(
        agents,
        eq(agents.id, userAgents.agentId)
      )
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.userId, user.id)
        )
      );

    if (!rows.length) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const attempts = await db
      .select({
        attemptNumber: taskAttempts.attemptNumber,
        status: taskAttempts.status,
        provider: taskAttempts.provider,
        requestedModel: taskAttempts.requestedModel,
        model: taskAttempts.model,
        latencyMs: taskAttempts.latencyMs,
        errorCode: taskAttempts.errorCode,
        errorMessage: taskAttempts.errorMessage,
        retryable: taskAttempts.retryable,
        startedAt: taskAttempts.startedAt,
        endedAt: taskAttempts.endedAt,
      })
      .from(taskAttempts)
      .where(eq(taskAttempts.taskId, id))
      .orderBy(taskAttempts.attemptNumber);

    const paymentAttempts = await db
      .select({
        kind: taskPaymentAttempts.kind,
        attemptNumber: taskPaymentAttempts.attemptNumber,
        status: taskPaymentAttempts.status,
        provider: taskPaymentAttempts.provider,
        circleTransactionId: taskPaymentAttempts.circleTransactionId,
        txHash: taskPaymentAttempts.txHash,
        blockNumber: taskPaymentAttempts.blockNumber,
        errorCode: taskPaymentAttempts.errorCode,
        error: taskPaymentAttempts.error,
        preparedAt: taskPaymentAttempts.preparedAt,
        submittedAt: taskPaymentAttempts.submittedAt,
        confirmedAt: taskPaymentAttempts.confirmedAt,
        failedAt: taskPaymentAttempts.failedAt,
      })
      .from(taskPaymentAttempts)
      .where(eq(taskPaymentAttempts.taskId, id))
      .orderBy(taskPaymentAttempts.preparedAt);

    const task = rows[0];
    return NextResponse.json({
      ...task,
      workflowState: deriveTaskWorkflowState({
        executionStatus: task.status,
        paymentStatus: task.paymentStatus,
        attemptCount: task.attemptCount,
      }),
      attempts,
      paymentAttempts,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/tasks/[id]");
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const id = parseTaskId((await params).id);
    const user = await requireCurrentUser();
    const body = await request.json();

    if (body?.action === "cancel") {
      const task = await cancelTask(user.id, id);
      await wakeWorkerSafely("payments", {
        deduplicationId: wakeDeduplicationId(
          "payments",
          `cancel-${id}`
        ),
      });
      return NextResponse.json(task);
    }
    if (body?.action === "retry") {
      const task = await retryTask(user.id, id);
      await wakeWorkerSafely("tasks", {
        deduplicationId: wakeDeduplicationId("tasks", `retry-${id}`),
      });
      return NextResponse.json(task);
    }
    throw invalidInput("The supported task actions are cancel and retry");
  } catch (error) {
    return errorResponse(error, "PATCH /api/tasks/[id]");
  }
}
