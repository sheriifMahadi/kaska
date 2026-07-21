"use client";

import { useEffect, useMemo, useState } from "react";

import { MarketplaceHeader } from "./marketplace-header";
import { MarketplaceToolbar } from "./marketplace-toolbar";
import { AgentGrid } from "./agent-grid";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  pricingModel: "task" | "hour";
  taskPrice: string | null;
  hourlyRate: string | null;
  isActive: boolean;
};

export function AgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [creatingTaskId, setCreatingTaskId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();

        setAgents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAgents();
  }, []);

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

  if (loading) {
    return (
      <div className="p-8 text-zinc-400">
        Loading marketplace...
      </div>
    );
  }

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

      <AgentGrid
        agents={filteredAgents}
        creatingTaskId={creatingTaskId}
        onHire={hireAgent}
      />
    </div>
  );
}