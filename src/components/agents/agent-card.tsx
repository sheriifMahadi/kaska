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
  employmentId: string | null;
  employmentStatus: "active" | "archived" | null;
  isAvailable: boolean;
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
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition ${agent.isAvailable ? "hover:border-violet-500" : "opacity-50"}`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">
            {agent.name}
          </h3>
          {!agent.isAvailable ? (
            <span className="mt-2 inline-block rounded-full border border-zinc-700 px-2 py-0.5 text-xs text-zinc-500">
              Coming soon
            </span>
          ) : null}

        </div>

      </div>

      <p className="mb-5 min-h-12 text-sm leading-6 text-zinc-400">
        {agent.description}
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {agent.capabilities.map((capability) => (
          <span key={capability} className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-500">
            {capability.replaceAll("-", " ")}
          </span>
        ))}
      </div>

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
          disabled={!agent.isAvailable || loading || agent.employmentStatus === "active"}
          className="flex-1 rounded-xl bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {!agent.isAvailable
            ? "Unavailable"
            : loading
            ? "Employing..."
            : agent.employmentStatus === "active"
              ? "Employed"
              : "Employ"}
        </button>
      </div>
    </div>
  );
}
