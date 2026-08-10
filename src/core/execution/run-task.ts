import { eq } from "drizzle-orm";

import { agents, taskOutputs, tasks, userAgents } from "@/db/schema";
import { db } from "@/lib/db";
import {
  buildSystemPrompt,
} from "./prompts/build-system-prompt";
import { createAIProvider } from "./providers/provider-factory";
import { normalizeProviderError } from "./providers/provider-error";
import { canUseWebSearch } from "./providers/tool-policy";
import { getAgentExecutionProfile } from "./agent-execution-profiles";

export async function runTask(taskId: string) {
  const [context] = await db
    .select({
      title: tasks.title,
      prompt: tasks.prompt,
      agentName: agents.name,
      agentSlug: agents.slug,
      agentDescription: agents.description,
      capabilities: agents.capabilities,
    })
    .from(tasks)
    .innerJoin(userAgents, eq(userAgents.id, tasks.userAgentId))
    .innerJoin(agents, eq(agents.id, userAgents.agentId))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!context) throw new Error("Task execution context not found");

  const profile = getAgentExecutionProfile(context.agentSlug);
  if (!profile) {
    throw new Error("This agent does not have an approved execution profile");
  }

  const provider = await createAIProvider(profile.provider);
  const systemPrompt = buildSystemPrompt({
    agent: {
      name: context.agentName,
      description: context.agentDescription,
      capabilities: context.capabilities,
    },
    promptKey: profile.promptKey,
    executionTimestamp: new Date().toISOString(),
  });
  const startedAt = performance.now();

  try {
    const allowWebSearch = canUseWebSearch(
      profile.provider,
      context.capabilities
    );
    const result = await provider.execute({
      model: profile.model,
      systemPrompt,
      userPrompt: `Task: ${context.title}\n\nInstructions:\n${context.prompt}`,
      allowWebSearch,
      maxOutputTokens: profile.maxOutputTokens,
      timeoutMs: profile.timeoutMs,
    });
    const latencyMs = Math.round(performance.now() - startedAt);

    if (!result.output.trim()) {
      throw new Error("The AI provider returned an empty result");
    }
    if (allowWebSearch && !result.usedTools.includes("web_search")) {
      throw new Error("The web monitoring agent did not perform its required web search");
    }

    await db.insert(taskOutputs).values({
      taskId,
      output: result.output,
      requestedModel: profile.model,
      provider: provider.name,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      tokens: result.totalTokens.toString(),
      latencyMs,
      finishReason: result.finishReason,
      format: profile.outputFormat,
      cost: result.cost,
    });

    return {
      provider: provider.name,
      requestedModel: profile.model,
      model: result.model,
      latencyMs,
    };
  } catch (error) {
    throw normalizeProviderError(
      error,
      provider.name,
      Math.round(performance.now() - startedAt),
      profile.model
    );
  }
}
