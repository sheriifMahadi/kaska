export interface AIProvider {
  execute(prompt: string): Promise<{
    output: string;
    model?: string;
    tokens?: number;
    cost?: string;
  }>;
}