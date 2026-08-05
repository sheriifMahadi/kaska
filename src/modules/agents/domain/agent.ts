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
  "archived",
] as const;

export type EmploymentStatus =
  (typeof EMPLOYMENT_STATUSES)[number];

export type EmploymentAction =
  | "create"
  | "reactivate"
  | "already_active"
  | "unavailable";

export function isEmploymentStatus(
  value: unknown
): value is EmploymentStatus {
  return (
    typeof value === "string" &&
    EMPLOYMENT_STATUSES.some((status) => status === value)
  );
}

export function supportsNewWork(status: EmploymentStatus) {
  return status === "active";
}

export function canTransitionEmployment(
  current: EmploymentStatus,
  next: EmploymentStatus
) {
  return current === "active" && next === "archived";
}

export function employmentAction(
  agentIsActive: boolean,
  currentStatus: EmploymentStatus | null
): EmploymentAction {
  if (!agentIsActive) return "unavailable";
  if (currentStatus === "active") return "already_active";
  if (currentStatus === "archived") return "reactivate";
  return "create";
}
