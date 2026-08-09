"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageLoadingSkeleton } from "@/components/shared/loading-skeleton";

import { TaskForm } from "./task-form";

type Agent = {
  userAgentId: string;
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  status: "active";
};

type Props = {
  userAgentId: string;
};

export function RunTaskClient({ userAgentId }: Props) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAgent() {
      const res = await fetch("/api/user-agents");

      if (!res.ok) return;

      const agents = await res.json();

      const current = agents.find(
        (a: Agent) => a.userAgentId === userAgentId
      );

      setAgent(current ?? null);
      setLoading(false);
    }

    loadAgent();
  }, [userAgentId]);

  if (loading) {
    return <PageLoadingSkeleton cards={1} />;
  }

  if (!agent) {
    return (
      <div className="p-8 text-red-400">
        Agent not found.
      </div>
    );
  }

  if (agent.status !== "active") {
    return (
      <div className="p-8 text-amber-300">
        This agent is {agent.status} and cannot accept new work.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Link
        href={"/jobs/agents/" + agent.userAgentId}
        className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"
      >
        <ArrowLeft size={16} /> Back
      </Link>
      <TaskForm agent={{ ...agent, status: "active" }} />
    </div>
  );
}
