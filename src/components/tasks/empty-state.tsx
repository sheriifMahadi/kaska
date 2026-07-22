"use client";

import { useRouter } from "next/navigation";

export function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-600/20">
          <span className="text-3xl">🤖</span>
        </div>

        <h2 className="text-2xl font-semibold text-white">
          No Agents Hired
        </h2>

        <p className="mt-3 text-zinc-400">
          Hire your first AI agent from the Marketplace to start building your workforce.
        </p>

        <button
          onClick={() => router.push("/agents")}
          className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          Go to Marketplace
        </button>
      </div>
    </div>
  );
}