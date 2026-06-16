"use client";

import { useEffect, useState } from "react";

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
  const [creatingTaskId, setCreatingTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();

        setAgents(data);
      } catch (err) {
        console.error("Failed to load agents", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function hireAgent(agentId: string) {
    setCreatingTaskId(agentId);
    setMessage(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          input: "Test task: generate a sample AI response",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create task");
      }

      const data = await res.json();

      console.log("Task created:", data);

      setMessage("Task created successfully ✅");
    } catch (err) {
      console.error(err);
      setMessage("Failed to create task ❌");
    } finally {
      setCreatingTaskId(null);
    }
  }

  if (loading) {
    return <div>Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Agents</h2>

      {message && (
        <div className="text-sm text-gray-600">
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="font-medium">
              {agent.name}
            </div>

            <div className="text-sm text-gray-500">
              {agent.type}
            </div>

            <div className="text-sm">
              {agent.pricingModel === "task" ? (
                <span>
                  ${agent.taskPrice} per task
                </span>
              ) : (
                <span>
                  ${agent.hourlyRate} per hour
                </span>
              )}
            </div>

            <div className="text-sm text-gray-600">
              {agent.description}
            </div>

            <button
              onClick={() => hireAgent(agent.id)}
              disabled={creatingTaskId === agent.id}
              className="px-3 py-1 bg-black text-white rounded"
            >
              {creatingTaskId === agent.id
                ? "Creating Task..."
                : "Hire Agent"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}