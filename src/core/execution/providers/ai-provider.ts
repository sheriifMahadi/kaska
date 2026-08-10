import type { AgentExecutionProvider } from
  "@/modules/agents/domain/agent";

export type ExecutionRequest = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  allowWebSearch: boolean;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type ExecutionResult = {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: string | null;
  finishReason: string | null;
  usedTools: string[];
};

export interface AIProvider {
  readonly name: AgentExecutionProvider;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
