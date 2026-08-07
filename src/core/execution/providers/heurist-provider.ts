import OpenAI from "openai";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";
import { serverConfig } from "@/platform/config/server";

const client = new OpenAI({
  apiKey: serverConfig.heuristApiKey,
  baseURL: "https://llm-gateway.heurist.xyz/v1",
});

export class HeuristProvider implements AIProvider {
  readonly name = "heurist" as const;

  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3-70b-instruct",
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
      temperature: 0.7,
    });

    return {
      output:
        response.choices[0]?.message?.content ??
        "No response",
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      cost: null,
      finishReason: response.choices[0]?.finish_reason ?? null,
    };
  }
}
