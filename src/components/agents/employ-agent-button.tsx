"use client";

import { useState } from "react";

type Props = {
  agentId: string;
  employmentStatus: "active" | "paused" | "archived" | null;
};

export function EmployAgentButton({
  agentId,
  employmentStatus,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [employed, setEmployed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function employ() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Agent could not be employed");
      }

      setMessage("Agent added to your workforce.");
      setEmployed(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Agent could not be employed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading || Boolean(employmentStatus) || employed}
        onClick={employ}
        className="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {loading
          ? "Employing..."
          : employmentStatus
            ? `Already employed · ${employmentStatus}`
            : employed
              ? "Employed"
              : "Employ agent"}
      </button>
      {message && (
        <p aria-live="polite" className="mt-3 text-sm text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}
