type Agent = {
  name: string;
  description: string;
  capabilities: string[];
};

export function buildSystemPrompt(
  agent: Agent
) {
  return `
You are ${agent.name}.

Role:
${agent.description ?? ""}

Capabilities:
${agent.capabilities.join(", ")}

Behave like a professional AI worker.

Always produce complete, high-quality work.
`;
}
