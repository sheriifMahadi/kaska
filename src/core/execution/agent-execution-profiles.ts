import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export type AgentExecutionProfile = Readonly<{
  agentSlug: string;
  provider: AgentExecutionProvider;
  model: string;
  promptKey: string;
  tools: readonly ("web_search")[];
  outputFormat: "markdown_v1" | "structured_data_v1";
  maxOutputTokens: number;
  timeoutMs: number;
}>;

const profiles = {
  "research-agent": {
    agentSlug: "research-agent",
    provider: "openrouter",
    model: "deepseek/deepseek-chat-v3.1",
    promptKey: "research_v1",
    tools: ["web_search"],
    outputFormat: "markdown_v1",
    maxOutputTokens: 1_200,
    timeoutMs: 90_000,
  },
  "content-agent": {
    agentSlug: "content-agent",
    provider: "openrouter",
    model: "mistralai/mistral-small-2603",
    promptKey: "content_v1",
    tools: [],
    outputFormat: "markdown_v1",
    maxOutputTokens: 1_500,
    timeoutMs: 90_000,
  },
  "web-scraper-agent": {
    agentSlug: "web-scraper-agent",
    provider: "openrouter",
    model: "google/gemini-2.5-flash-lite",
    promptKey: "web_scraper_v1",
    tools: ["web_search"],
    outputFormat: "structured_data_v1",
    maxOutputTokens: 800,
    timeoutMs: 90_000,
  },
  "trading-research-agent": {
    agentSlug: "trading-research-agent",
    provider: "openrouter",
    model: "google/gemini-3.1-flash-lite",
    promptKey: "crypto_research_v1",
    tools: ["web_search"],
    outputFormat: "markdown_v1",
    maxOutputTokens: 1_000,
    timeoutMs: 90_000,
  },
} as const satisfies Record<string, AgentExecutionProfile>;

export function getAgentExecutionProfile(agentSlug: string) {
  return profiles[agentSlug as keyof typeof profiles] ?? null;
}

export function hasAgentExecutionProfile(agentSlug: string) {
  return getAgentExecutionProfile(agentSlug) !== null;
}

export function listAgentExecutionProfiles(): readonly AgentExecutionProfile[] {
  return Object.values(profiles);
}
