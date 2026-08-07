import { eq } from "drizzle-orm";

import { agents, taskOutputs, tasks, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  buildSystemPrompt,
  TASK_OUTPUT_FORMAT,
} from "./prompts/build-system-prompt";
import { createAIProvider } from "./providers/provider-factory";
import { normalizeProviderError } from "./providers/provider-error";

export async function runTask(taskId: string) {
  const [context] = await db
    .select({
      title: tasks.title,
      prompt: tasks.prompt,
      agentName: agents.name,
      agentDescription: agents.description,
      capabilities: agents.capabilities,
      executionProvider: agents.executionProvider,
    })
    .from(tasks)
    .innerJoin(userAgents, eq(userAgents.id, tasks.userAgentId))
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!context) throw new Error("Task execution context not found");

  const provider = await createAIProvider(context.executionProvider);
  const systemPrompt = buildSystemPrompt({
    name: context.agentName,
    description: context.agentDescription,
    capabilities: context.capabilities,
  });
  const startedAt = performance.now();

  try {
    const result = await provider.execute({
      systemPrompt,
      userPrompt: `Task: ${context.title}\n\nInstructions:\n${context.prompt}`,
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!result.output.trim()) {
      throw new Error("The AI provider returned an empty result");
    }

    await db.insert(taskOutputs).values({
      taskId,
      output: result.output,
      provider: provider.name,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      tokens: result.totalTokens.toString(),
      latencyMs,
      finishReason: result.finishReason,
      format: TASK_OUTPUT_FORMAT,
      cost: result.cost,
    });

    return {
      provider: provider.name,
      model: result.model,
      latencyMs,
    };
  } catch (error) {
    throw normalizeProviderError(
      error,
      provider.name,
      Math.round(performance.now() - startedAt)
    );
  }
}
