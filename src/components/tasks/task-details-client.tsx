"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;

  title: string;
  prompt: string;

  status: string;
  priority: string;

  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;

  error: string | null;

  agentName: string;
  agentType: string;

  output: string | null;
  model: string | null;
  tokens: string | null;
  cost: string | null;
};

export function TaskDetailsClient({
  taskId,
}: {
  taskId: string;
}) {
  const [task, setTask] = useState<Task | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTask() {
      const res = await fetch(`/api/tasks/${taskId}`);

      if (!res.ok) {
        setLoading(false);
        return;
      }

      setTask(await res.json());

      setLoading(false);
    }

    loadTask();
  }, [taskId]);

  if (loading) {
    return (
      <div className="text-zinc-400">
        Loading...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-red-500">
        Task not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h1 className="text-2xl font-bold">
          {task.title}
        </h1>

        <p className="mt-2 text-zinc-400">
          {task.agentName}
        </p>

      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="mb-4 font-semibold">
          Prompt
        </h2>

        <pre className="whitespace-pre-wrap text-zinc-300">
          {task.prompt}
        </pre>

      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="mb-4 font-semibold">
          Output
        </h2>

        <pre className="whitespace-pre-wrap text-zinc-300">
          {task.output ?? "Still running..."}
        </pre>

      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h2 className="mb-4 font-semibold">
          Execution
        </h2>

        <div className="space-y-2 text-sm text-zinc-400">

          <div>
            Status: {task.status}
          </div>

          <div>
            Priority: {task.priority}
          </div>

          <div>
            Model: {task.model ?? "-"}
          </div>

          <div>
            Tokens: {task.tokens ?? "-"}
          </div>

          <div>
            Cost: {task.cost ?? "-"}
          </div>

          <div>
            Started:
            {" "}
            {task.startedAt ?? "-"}
          </div>

          <div>
            Completed:
            {" "}
            {task.completedAt ?? "-"}
          </div>

        </div>

      </div>

      {task.error && (
        <div className="rounded-xl border border-red-900 bg-red-950 p-6 text-red-300">
          {task.error}
        </div>
      )}

    </div>
  );
}