import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export function canUseWebSearch(
  provider: AgentExecutionProvider,
  approvedTools: readonly string[]
) {
  return (
    (provider === "openrouter" || provider === "openai") &&
    approvedTools.includes("web_search")
  );
}
