import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";
import type { AIProvider } from "./ai-provider";

export async function createAIProvider(
  provider: AgentExecutionProvider
): Promise<AIProvider> {
  switch (provider) {
    case "openrouter": {
      const { OpenRouterProvider } = await import("./openrouter-provider");
      return new OpenRouterProvider();
    }
    case "openai": {
      const { OpenAIProvider } = await import("./openai");
      return new OpenAIProvider();
    }
    case "heurist": {
      const { HeuristProvider } = await import("./heurist-provider");
      return new HeuristProvider();
    }
  }
}
