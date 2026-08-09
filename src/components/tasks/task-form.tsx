"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Agent = {
  userAgentId: string;
  agentId: string;
  name: string;
  description: string;
  capabilities: string[];
  status: "active";
  supportsOneTime: boolean;
  supportsRecurring: boolean;
};

type Props = {
  agent: Agent;
};

export function TaskForm({ agent }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [workMode, setWorkMode] = useState<"one-time" | "recurring">(
    agent.supportsOneTime ? "one-time" : "recurring"
  );
  const [intervalMinutes, setIntervalMinutes] = useState("60");
  const [spendingLimit, setSpendingLimit] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const recurring = workMode === "recurring";
      const res = await fetch(
        recurring ? "/api/recurring-jobs" : "/api/tasks",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          recurring
            ? {
                userAgentId: agent.userAgentId,
                name: title,
                instructions: prompt,
                intervalMinutes: Number(intervalMinutes),
                spendingLimit,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                startsAt: startsAt
                  ? new Date(startsAt).toISOString()
                  : null,
                endsAt: endsAt ? new Date(endsAt).toISOString() : null,
              }
            : {
                userAgentId: agent.userAgentId,
                title,
                prompt,
                priority: "normal",
              }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }

      router.push(
        recurring
          ? `/jobs/agents/${agent.userAgentId}`
          : `/jobs/${data.task.id}?fromAgent=${encodeURIComponent(agent.userAgentId)}`
      );
    } catch (err) {
      console.error(err);
      setMessage(
        err instanceof Error ? err.message : "Could not create this work."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
      <h1 className="mb-2 text-3xl font-bold text-white">
        Run {agent.name}
      </h1>

      <p className="mb-8 text-zinc-400">
        Assign work to this AI worker.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Task Title
          </label>

          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Market Research"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Prompt
          </label>

          <textarea
            required
            rows={8}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Research the latest stablecoin regulations..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <p className="mb-2 block text-sm text-zinc-400">Work mode</p>
          {agent.supportsOneTime && agent.supportsRecurring ? (
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              {(["one-time", "recurring"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkMode(mode)}
                  className={`rounded-lg px-4 py-2.5 text-sm capitalize transition ${workMode === mode ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-white"}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm capitalize text-zinc-300">
              {workMode}
            </div>
          )}
        </div>

        {workMode === "recurring" ? (
          <div className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-2">
            <ScheduleField label="Run every (minutes)">
              <input required type="number" min="1" max="43200" value={intervalMinutes} onChange={(event) => setIntervalMinutes(event.target.value)} className={scheduleControlClass} />
            </ScheduleField>
            <ScheduleField label="Total spending limit (USDC)">
              <input required inputMode="decimal" placeholder="5.00" value={spendingLimit} onChange={(event) => setSpendingLimit(event.target.value)} className={scheduleControlClass} />
            </ScheduleField>
            <ScheduleField label="Start time (optional)">
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={scheduleControlClass} />
            </ScheduleField>
            <ScheduleField label="End time (optional)">
              <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className={scheduleControlClass} />
            </ScheduleField>
          </div>
        ) : null}

        {message && (
          <div className="rounded-lg border border-violet-700 bg-violet-900/20 p-3 text-violet-300">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || title.trim().length < 3 || prompt.trim().length < 10}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {loading
            ? "Creating..."
            : workMode === "recurring"
              ? "Create schedule"
              : "Run job"}
        </button>

      </form>
    </div>
  );
}

function ScheduleField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <label className="space-y-2"><span className="block text-sm text-zinc-400">{label}</span>{children}</label>;
}

const scheduleControlClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-violet-500";
