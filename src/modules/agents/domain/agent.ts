export const AGENT_EXECUTION_PROVIDERS = [
  "openrouter",
  "openai",
  "heurist",
] as const;

export type AgentExecutionProvider =
  (typeof AGENT_EXECUTION_PROVIDERS)[number];

export const AGENT_PRICING_TYPES = ["fixed_per_run"] as const;

export type AgentPricingType =
  (typeof AGENT_PRICING_TYPES)[number];

export const EMPLOYMENT_STATUSES = [
  "active",
  "paused",
  "archived",
] as const;

export type EmploymentStatus =
  (typeof EMPLOYMENT_STATUSES)[number];

export function supportsNewWork(status: EmploymentStatus) {
  return status === "active";
}
