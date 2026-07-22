import { openai } from "@/lib/openai";
import {
  AIProvider,
  ExecutionResult,
} from "./provider";

export class OpenAIProvider implements AIProvider {
  async execute(
    systemPrompt: string,
    userPrompt: string
  ): Promise<ExecutionResult> {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
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
      cost: 0,
    };
  }
}