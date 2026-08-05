"use client";

import { useRouter } from "next/navigation";

type UserAgent = {
  userAgentId: string;
  hiredAt: string;
  status: string;
  perRunLimit: string | null;
  dailyLimit: string | null;
  monthlyLimit: string | null;
  totalSpent: string | null;

  agentId: string;
  name: string;
  slug: string;
  description: string;
  capabilities: string[];
  pricingType: "fixed_per_run";
  price: string;
  supportsOneTime: boolean;
  supportsRecurring: boolean;
};

type Props = {
  agent: UserAgent;
};

export function TaskAgentCard({ agent }: Props) {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg transition hover:border-violet-600">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {agent.name}
          </h2>

          <p className="mt-1 text-sm text-zinc-400">
            {agent.description}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            agent.status === "active"
              ? "bg-green-500/20 text-green-400"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {agent.status}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Capabilities</p>
          <p className="mt-1 text-white capitalize">
            {agent.capabilities.join(", ")}
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Monthly Limit</p>
          <p className="mt-1 text-white">
            {agent.monthlyLimit ?? "—"} USDC
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">
            Price Per Run
          </p>
          <p className="mt-1 text-white">
            {agent.price} USDC
          </p>
        </div>

        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">
            Total Spent
          </p>
          <p className="mt-1 text-white">
            {agent.totalSpent ?? "0"} USDC
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() =>
            router.push(`/tasks/new?agent=${agent.userAgentId}`)
          }
          className="flex-1 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-500"
        >
          Run Task
        </button>

        <button
          className="rounded-lg border border-zinc-700 px-4 py-2 text-zinc-300 transition hover:border-violet-600 hover:text-white"
        >
          History
        </button>
      </div>
    </div>
  );
}
