import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  tasks,
  taskOutputs,
  userAgents,
  agents,
} from "@/db/schema";

import { OpenRouterProvider } from "./providers/openrouter-provider";
import { buildSystemPrompt } from "./prompts/build-system-prompt";

export async function runTask(taskId: string) {
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId));

  if (!task) {
    throw new Error("Task not found");
  }

  const [worker] = await db
    .select()
    .from(userAgents)
    .where(eq(userAgents.id, task.userAgentId));

  if (!worker) {
    throw new Error("Worker not found");
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, worker.agentId));

  if (!agent) {
    throw new Error("Agent not found");
  }

  const systemPrompt = buildSystemPrompt(agent);

  const provider = new OpenRouterProvider();

  const result = await provider.execute({
    systemPrompt,
    userPrompt: `Task: ${task.title}\n\nInstructions:\n${task.prompt}`,
  });

  await db.insert(taskOutputs).values({
    taskId,
    output: result.output,
    model: result.model,
    tokens: result.tokens.toString(),
    cost: result.cost,
  });

  return result.output;
}
