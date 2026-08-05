"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UserAgent = {
  userAgentId: string;
  createdAt: string;
  status: "active";
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
  onUpdated: () => Promise<void>;
};

export function TaskAgentCard({ agent, onUpdated }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function archive() {
    if (!window.confirm("Archive this agent? You can employ it again later.")) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/user-agents/${agent.userAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Archive failed");
      await onUpdated();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archive failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg transition hover:border-violet-600">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{agent.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">{agent.description}</p>
        </div>
        <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
          active
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Capabilities</p>
          <p className="mt-1 text-white capitalize">{agent.capabilities.join(", ")}</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Work modes</p>
          <p className="mt-1 text-white">
            {[agent.supportsOneTime && "One-time", agent.supportsRecurring && "Recurring"]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Price Per Run</p>
          <p className="mt-1 text-white">{agent.price} USDC</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-500">Total Spent</p>
          <p className="mt-1 text-white">{agent.totalSpent ?? "0"} USDC</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => router.push(`/tasks/new?agent=${agent.userAgentId}`)}
          className="flex-1 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-500"
        >
          Run Task
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={archive}
          className="rounded-lg border border-red-900 px-4 py-2 text-red-400 transition hover:border-red-600 disabled:opacity-50"
        >
          {busy ? "Archiving..." : "Archive"}
        </button>
      </div>

      {message && <p aria-live="polite" className="mt-3 text-sm text-red-400">{message}</p>}
    </div>
  );
}
