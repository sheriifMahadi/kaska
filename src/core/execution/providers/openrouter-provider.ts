import { openrouter } from "@/lib/openrouter";

export class OpenRouterProvider {
  async execute(prompt: string) {
    const response = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return {
      output:
        response.choices[0].message.content ??
        "No response generated.",
      model: response.model,
      tokens: response.usage?.total_tokens ?? 0,
    };
  }
}