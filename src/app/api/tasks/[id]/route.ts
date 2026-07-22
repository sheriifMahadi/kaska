import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  users,
  tasks,
  taskOutputs,
  userAgents,
  agents,
} from "@/db/schema";

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
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

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
        agentType: agents.type,

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
    console.error(error);

    return NextResponse.json(
      { error: "Failed to load task" },
      { status: 500 }
    );
  }
}