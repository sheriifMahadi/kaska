import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, tasks, agents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { enqueueTask } from "@/core/execution/queue";

/* --------------------------------------------------
   GET: Fetch user tasks
-------------------------------------------------- */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, dbUser.id))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(userTasks);
}

/* --------------------------------------------------
   POST: Create task (execution delegated)
-------------------------------------------------- */
export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { agentId, input } = await req.json();

  if (!agentId || !input) {
    return NextResponse.json(
      { error: "agentId and input are required" },
      { status: 400 }
    );
  }

  // Get internal user
  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Validate agent
  const agent = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .then((r) => r[0]);

  if (!agent) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404 }
    );
  }

  // Create task
  const [task] = await db
    .insert(tasks)
    .values({
      userId: dbUser.id,
      agentId,
      input,
      status: "queued",
    })
    .returning();

  // Delegated execution (no logic here anymore)
  enqueueTask(task.id);

  return NextResponse.json({
    task,
    status: "queued",
  });
}