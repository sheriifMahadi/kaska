import { AgentCard } from "./agent-card";

interface Props {
  agents: any[];
  creatingTaskId: string | null;
  onHire: (id: string) => void;
}

export function AgentGrid({
  agents,
  creatingTaskId,
  onHire,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          loading={creatingTaskId === agent.id}
          onHire={() => onHire(agent.id)}
        />
      ))}
    </div>
  );
}