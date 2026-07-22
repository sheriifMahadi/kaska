import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.HEURIST_API_KEY,
  baseURL: "https://llm-gateway.heurist.xyz/v1",
});

export class HeuristProvider {
  async execute(prompt: string) {
    const response = await client.chat.completions.create({
      model: "meta-llama/llama-3-70b-instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    return {
      output:
        response.choices[0]?.message?.content ??
        "No response",
      model: response.model,
      tokens:
        response.usage?.total_tokens ?? 0,
    };
  }
}