import { db } from "@/lib/db";
import { tasks, taskOutputs, agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateAgentOutput } from "./agent-strategy";

export async function executeTask(taskId: string) {
  const startTime = Date.now();
  const MAX_RETRIES = 2;

  // retry tracking
  let attempts = 0;
  let lastError: any = null;

  // fetch task once
  const task = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .then((r) => r[0]);

  if (!task) throw new Error("Task not found");

  // 🧠 STEP 4: IDENTITY LOCK (prevents duplicate execution)
  const locked = await db
    .update(tasks)
    .set({ status: "running" })
    .where(eq(tasks.id, taskId))
    .returning();

  if (!locked[0]) {
    console.log(`[SKIP LOCKED TASK] ${taskId}`);
    return;
  }

  // 🧠 STEP 4: RETRY LOOP
  while (attempts <= MAX_RETRIES) {
    try {
      attempts++;

      console.log(`[TASK ATTEMPT ${attempts}] ${taskId}`);

      // simulate execution delay (temporary)
      await new Promise((r) => setTimeout(r, 1200));

      // fetch agent
      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, task.agentId))
        .then((r) => r[0]);

      if (!agent) {
        throw new Error("Agent not found");
      }

      // generate output (agent-aware logic)
      const output = generateAgentOutput(agent.type, task.input);

      const duration = Date.now() - startTime;

      // store output with metadata
      await db.insert(taskOutputs).values({
        taskId,
        output: JSON.stringify({
          output,
          metadata: {
            attempt: attempts,
            durationMs: duration,
            agentType: agent.type,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
          },
        }),
      });

      // mark completed
      await db
        .update(tasks)
        .set({
          status: "completed",
        })
        .where(eq(tasks.id, taskId));

      console.log(`[TASK SUCCESS] ${taskId}`);

      return output;
    } catch (err: any) {
      lastError = err;

      console.warn(`[TASK FAILED ATTEMPT ${attempts}]`, err);

      // retry if possible
      if (attempts <= MAX_RETRIES) {
        console.log(`[RETRYING TASK] ${taskId}`);
        continue;
      }

      break;
    }
  }

  // FINAL FAILURE STATE
  const duration = Date.now() - startTime;

  await db
    .update(tasks)
    .set({
      status: "failed",
    })
    .where(eq(tasks.id, taskId));

  await db.insert(taskOutputs).values({
    taskId,
    output: JSON.stringify({
      error: lastError?.message || "Unknown error",
      metadata: {
        durationMs: duration,
        failedAt: new Date().toISOString(),
        attempts,
      },
    }),
  });

  console.error(`[TASK FINAL FAILURE] ${taskId}`, lastError);

  throw lastError;
}