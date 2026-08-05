"use client";

import { useMemo, useState } from "react";

import { MarketplaceHeader } from "./marketplace-header";
import { MarketplaceToolbar } from "./marketplace-toolbar";
import { AgentGrid } from "./agent-grid";

type Agent = {
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

type Props = {
  initialAgents: Agent[];
};

export function AgentsClient({ initialAgents }: Props) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

  const [search, setSearch] = useState("");

  const [creatingTaskId, setCreatingTaskId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  async function hireAgent(agentId: string) {
  setCreatingTaskId(agentId);
  setMessage(null);

  try {
    const res = await fetch("/api/user-agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Failed to hire agent");
    }

    setMessage("✅ Agent hired successfully.");

    // Refresh the marketplace state after hiring
    const agentsRes = await fetch("/api/agents");
    const agentsData = await agentsRes.json();

    setAgents(agentsData);
  } catch (err) {
    if (err instanceof Error) {
      setMessage(`❌ ${err.message}`);
    } else {
      setMessage("❌ Failed to hire agent.");
    }
  } finally {
    setCreatingTaskId(null);
  }
}

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) =>
      agent.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [agents, search]);

  return (
    <div className="min-h-screen bg-[#050505] p-8">

      <MarketplaceHeader />

      <MarketplaceToolbar
        search={search}
        onSearch={setSearch}
      />

      {message && (
        <div className="mb-6 rounded-xl border border-violet-700 bg-violet-900/20 p-4 text-sm text-violet-300">
          {message}
        </div>
      )}

      {filteredAgents.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
          No active agents match your search.
        </div>
      ) : (
        <AgentGrid
          agents={filteredAgents}
          creatingTaskId={creatingTaskId}
          onHire={hireAgent}
        />
      )}
    </div>
  );
}
