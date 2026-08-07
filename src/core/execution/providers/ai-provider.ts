import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export type ExecutionRequest = {
  systemPrompt: string;
  userPrompt: string;
};

export type ExecutionResult = {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: string | null;
  finishReason: string | null;
};

export interface AIProvider {
  readonly name: AgentExecutionProvider;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
