export type ExecutionRequest = {
  systemPrompt: string;
  userPrompt: string;
};

export type ExecutionResult = {
  output: string;
  model: string;
  tokens: number;
  cost: string;
};

export interface AIProvider {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
