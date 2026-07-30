import { openrouter } from "@/lib/openrouter";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";

export class OpenRouterProvider implements AIProvider {
  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: request.systemPrompt,
        },
        {
          role: "user",
          content: request.userPrompt,
        },
      ],
    });

    return {
      output:
        response.choices[0].message.content ??
        "No response generated.",
      model: response.model,
      tokens: response.usage?.total_tokens ?? 0,
      cost: "0",
    };
  }
}
