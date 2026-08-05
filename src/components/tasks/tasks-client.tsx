"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "./empty-state";
import { TaskAgentCard } from "./task-agent-card";
import { TaskList } from "./task-list";

type UserAgent = {
  userAgentId: string;
  hiredAt: string;
  status: string;
  perRunLimit: string | null;
  dailyLimit: string | null;
  monthlyLimit: string | null;
  totalSpent: string |null;

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

type Task = {
  id: string;
  title: string;
  prompt: string;
  priority: string;
  status: string;
  createdAt: string;
  startedAt: string |null;
  completedAt: string |null;

  userAgentId: string;

  agentId: string;
  agentName: string;
  agentType: string;
};

export function TasksClient() {
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [agentsRes, tasksRes] = await Promise.all([
        fetch("/api/user-agents"),
        fetch("/api/tasks"),
      ]);

      if (!agentsRes.ok) {
        throw new Error("Failed to load agents");
      }

      if (!tasksRes.ok) {
        throw new Error("Failed to load tasks");
      }

      const agentsData: UserAgent[] = await agentsRes.json();
      const tasksData: Task[] = await tasksRes.json();

      setAgents(agentsData);
      setTasks(tasksData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(loadData, 0);

    return () => window.clearTimeout(initialLoad);
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-zinc-400">
        Loading your workspace...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white">
          My Agents
        </h1>

        <p className="mt-2 text-zinc-400">
          Manage your AI workforce and monitor active tasks.
        </p>
      </div>

      {/* Hired Agents */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Hired Agents
        </h2>

        {agents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {agents.map((agent) => (
              <TaskAgentCard
                key={agent.userAgentId}
                agent={agent}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent Tasks */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Recent Tasks
        </h2>

        <TaskList tasks={tasks} />
      </section>
    </div>
  );
}
