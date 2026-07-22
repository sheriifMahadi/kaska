import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  tasks,
  agents,
  userAgents,
} from "@/db/schema";

import { enqueueTask } from "@/core/execution/queue";

/* --------------------------------------------------
   GET: Fetch User Tasks
-------------------------------------------------- */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const userTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        prompt: tasks.prompt,
        priority: tasks.priority,
        status: tasks.status,
        createdAt: tasks.createdAt,
        startedAt: tasks.startedAt,
        completedAt: tasks.completedAt,

        userAgentId: userAgents.id,

        agentId: agents.id,
        agentName: agents.name,
        agentType: agents.type,
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
      .where(eq(tasks.userId, user.id))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json(userTasks);
  } catch (error) {
    console.error("GET /api/tasks:", error);

    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

/* --------------------------------------------------
   POST: Create Task
-------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      userAgentId,
      title,
      prompt,
      priority = "normal",
    } = body;

    if (!userAgentId || !title || !prompt) {
      return NextResponse.json(
        { error: "userAgentId, title and prompt are required." },
        { status: 400 }
      );
    }

    // Current user
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

    // Validate hired agent
    const [worker] = await db
      .select()
      .from(userAgents)
      .where(eq(userAgents.id, userAgentId));

    if (!worker) {
      return NextResponse.json(
        { error: "Worker not found" },
        { status: 404 }
      );
    }

    // Ensure worker belongs to current user
    if (worker.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized worker" },
        { status: 403 }
      );
    }

    // Create task
    const [task] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        userAgentId,
        title,
        prompt,
        priority,
        status: "queued",
      })
      .returning();

    // Send task to execution queue
    await enqueueTask(task.id);

    return NextResponse.json(
      {
        success: true,
        message: "Task queued successfully.",
        task,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/tasks:", error);

    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}