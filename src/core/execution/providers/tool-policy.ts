import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export function canUseWebSearch(
  provider: AgentExecutionProvider,
  capabilities: readonly string[]
) {
  return provider === "openai" && capabilities.includes("web-search");
}
