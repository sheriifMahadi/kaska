"use client";

import Link from "next/link";

export type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string;
  capabilities: string[];
  pricingType: "fixed_per_run";
  price: string;
  supportsOneTime: boolean;
  supportsRecurring: boolean;
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
            {agent.capabilities.join(" · ")}
          </p>
        </div>

      </div>

      <p className="mb-6 text-sm leading-6 text-zinc-400">
        {agent.description}
      </p>

      <div className="mb-6">
        <p className="text-lg font-bold text-white">
          {agent.price} USDC
          <span className="ml-1 text-sm text-zinc-500">
            / run
          </span>
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        {agent.supportsOneTime && (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
            One-time
          </span>
        )}
        {agent.supportsRecurring && (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-zinc-300">
            Recurring
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href={`/agents/${agent.slug}`}
          className="flex-1 rounded-xl border border-zinc-700 py-3 text-center font-medium text-zinc-200 transition hover:border-violet-500"
        >
          View details
        </Link>
        <button
          onClick={onHire}
          disabled={loading}
          className="flex-1 rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Employing..." : "Employ"}
        </button>
      </div>
    </div>
  );
}
