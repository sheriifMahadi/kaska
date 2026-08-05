import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  tasks,
  taskOutputs,
  userAgents,
  agents,
} from "@/db/schema";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { errorResponse } from "@/shared/http/error-response";

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
        error: tasks.error,

        agentName: agents.name,
        agentType: agents.slug,

        output: taskOutputs.output,
        model: taskOutputs.model,
        tokens: taskOutputs.tokens,
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

    return NextResponse.json(rows[0]);
  } catch (error) {
    return errorResponse(error, "GET /api/tasks/[id]");
  }
}
