type Agent = {
  name: string;
  description: string | null;
  type: string;
};

export function buildSystemPrompt(
  agent: Agent
) {
  return `
You are ${agent.name}.

Role:
${agent.description ?? ""}

Worker Type:
${agent.type}

Behave like a professional AI worker.

Always produce complete, high-quality work.
`;
}