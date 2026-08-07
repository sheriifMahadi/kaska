import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  tasks,
  taskAttempts,
  taskOutputs,
  userAgents,
  agents,
} from "@/db/schema";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { errorResponse } from "@/shared/http/error-response";
import { cancelTask } from
  "@/modules/tasks/application/cancel-task";
import { invalidInput } from
  "@/shared/errors/application-error";

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
    const { id } = await params;
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
        model: taskOutputs.model,
        tokens: taskOutputs.tokens,
        inputTokens: taskOutputs.inputTokens,
        outputTokens: taskOutputs.outputTokens,
        finishReason: taskOutputs.finishReason,
        outputFormat: taskOutputs.format,
        cost: taskOutputs.cost,
      })
      .from(tasks)
      .leftJoin(
        taskOutputs,
        eq(taskOutputs.taskId, tasks.id)
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

    return NextResponse.json({ ...rows[0], attempts });
  } catch (error) {
    return errorResponse(error, "GET /api/tasks/[id]");
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const user = await requireCurrentUser();
    const body = await request.json();

    if (body?.action !== "cancel") {
      throw invalidInput("The supported task action is cancel");
    }

    return NextResponse.json(await cancelTask(user.id, id));
  } catch (error) {
    return errorResponse(error, "PATCH /api/tasks/[id]");
  }
}
