"use client";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  pricingModel: "task" | "hour";
  taskPrice: string | null;
  hourlyRate: string | null;
};

interface Props {
  agent: Agent;
  loading: boolean;
  onHire: () => void;
}

export function AgentCard({
  agent,
  loading,
  onHire,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-violet-500">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">
            {agent.name}
          </h3>

          <p className="text-sm text-violet-400">
            {agent.type}
          </p>
        </div>

        <div className="rounded-full bg-violet-600/20 px-3 py-1 text-sm text-violet-300">
          ⭐ 4.9
        </div>
      </div>

      <p className="mb-6 text-sm leading-6 text-zinc-400">
        {agent.description}
      </p>

      <div className="mb-6">
        {agent.pricingModel === "task" ? (
          <p className="text-lg font-bold text-white">
            ${agent.taskPrice}
            <span className="ml-1 text-sm text-zinc-500">
              / task
            </span>
          </p>
        ) : (
          <p className="text-lg font-bold text-white">
            ${agent.hourlyRate}
            <span className="ml-1 text-sm text-zinc-500">
              / hour
            </span>
          </p>
        )}
      </div>

      <button
        onClick={onHire}
        disabled={loading}
        className="w-full rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "Hiring..." : "Hire Worker"}
      </button>
    </div>
  );
}