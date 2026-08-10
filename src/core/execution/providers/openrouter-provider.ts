import { openrouter } from "@/lib/openrouter";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";
import { buildOpenRouterRequest } from "./openrouter-request";

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;

  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await openrouter.chat.completions.create(
      buildOpenRouterRequest(request),
      { signal: AbortSignal.timeout(request.timeoutMs) }
    );

    return {
      output:
        response.choices[0].message.content ??
        "No response generated.",
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      cost: null,
      finishReason: response.choices[0]?.finish_reason ?? null,
      usedTools: [],
    };
  }
}
