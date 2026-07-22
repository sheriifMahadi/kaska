export interface ExecutionResult {
  output: string;
  model: string;
  tokens: number;
  cost: number;
}

export interface AIProvider {
  execute(
    systemPrompt: string,
    userPrompt: string
  ): Promise<ExecutionResult>;
}