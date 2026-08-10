import { openai } from "@/lib/openai";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await openai.responses.create({
      model: request.model,
      input: [
        {
          role: "system",
          content: request.systemPrompt,
        },
        {
          role: "user",
          content: request.userPrompt,
        },
      ],
      tools: request.allowWebSearch
        ? [{ type: "web_search" }]
        : undefined,
      tool_choice: request.allowWebSearch ? "required" : undefined,
      max_output_tokens: request.maxOutputTokens,
    }, { signal: AbortSignal.timeout(request.timeoutMs) });

    return {
      output:
        response.output_text ??
        "No output generated.",
      model: response.model,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      cost: null,
      finishReason: response.status ?? null,
      usedTools: response.output
        .filter((item) => item.type === "web_search_call")
        .map(() => "web_search"),
    };
  }
}
