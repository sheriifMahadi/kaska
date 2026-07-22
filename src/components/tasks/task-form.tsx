"use client";

import { useState } from "react";

type Agent = {
  userAgentId: string;
  agentId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
};

type Props = {
  agent: Agent;
};

export function TaskForm({ agent }: Props) {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAgentId: agent.userAgentId,
          title,
          prompt,
          priority,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed");
      }

      setTitle("");
      setPrompt("");
      setPriority("normal");

      setMessage("✅ Task queued successfully.");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to queue task.");
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
          <label className="mb-2 block text-sm text-zinc-400">
            Priority
          </label>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-white outline-none focus:border-violet-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        {message && (
          <div className="rounded-lg border border-violet-700 bg-violet-900/20 p-3 text-violet-300">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {loading ? "Queueing..." : "Run Task"}
        </button>

      </form>
    </div>
  );
}