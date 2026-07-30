import { openai } from "@/lib/openai";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";

export class OpenAIProvider implements AIProvider {
  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
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
    });

    return {
      output:
        response.output_text ??
        "No output generated.",
      model: response.model,
      tokens:
        response.usage?.total_tokens ?? 0,
      cost: "0",
    };
  }
}
