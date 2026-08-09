"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "./empty-state";
import { TaskAgentCard } from "./task-agent-card";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TaskList } from "./task-list";

type UserAgent = {
  userAgentId: string;
  createdAt: string;
  status: "active";
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
  status: string;
  workflowState: string;
  createdAt: string;
  agentName: string;
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
        throw new Error("Failed to load jobs");
      }

      const agentsData: UserAgent[] = await agentsRes.json();
      const tasksData: Task[] = await tasksRes.json();

      setAgents(agentsData);
      setTasks(tasksData.slice(0, 5));
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
    return <PageLoadingSkeleton cards={3} />;
  }

  return (
    <div className="space-y-10 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Jobs
        </h1>

        <p className="mt-2 text-zinc-400">
          Run your agents and review your latest work.
        </p>
      </div>

      {/* Hired Agents */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">
          Your Agents
        </h2>

        {agents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <TaskAgentCard
                key={agent.userAgentId}
                agent={agent}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
        <TaskList tasks={tasks} />
      </section>
    </div>
  );
}
