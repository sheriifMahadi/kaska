import type { AgentPromptKey } from
  "./prompts/build-system-prompt";

export type AgentEvaluationCase = Readonly<{
  promptKey: AgentPromptKey;
  title: string;
  instructions: string;
  expectations: readonly string[];
}>;

export const AGENT_EVALUATION_CASES: readonly AgentEvaluationCase[] = [
  {
    promptKey: "web_monitoring_v1",
    title: "Monitor a public reference value",
    instructions: "Check the current value of a named metric on its authoritative public page, preserve its units, and return a timestamped monitoring snapshot.",
    expectations: ["search performed", "timestamped source", "baseline stated", "missing fields explicit"],
  },
  {
    promptKey: "research_v1",
    title: "Compare current stablecoin payment options",
    instructions: "Compare three stablecoin payment options for a small SaaS product. Use current primary sources and explain the tradeoffs.",
    expectations: ["current sources", "material claims cited", "limitations stated"],
  },
  {
    promptKey: "content_v1",
    title: "Write a product launch article",
    instructions: "Write an 800-word launch article for a technical audience using the supplied product brief and a confident but factual tone.",
    expectations: ["finished article", "requested audience and tone", "no invented claims"],
  },
  {
    promptKey: "web_scraper_v1",
    title: "Extract a public pricing table",
    instructions: "Extract product, plan, and monthly price from the named public pricing page. Return a table and identify unavailable fields.",
    expectations: ["structured rows", "source URLs", "retrieval time", "missing fields explicit"],
  },
  {
    promptKey: "crypto_research_v1",
    title: "Create a current crypto market brief",
    instructions: "Produce a current market brief for BTC and ETH with observed data, recent developments, interpretation, and downside risks.",
    expectations: ["timestamped data", "sources", "analysis separated from facts", "risk disclaimer"],
  },
];
