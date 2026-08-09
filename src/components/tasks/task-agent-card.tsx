import Link from "next/link";

type UserAgent = {
  userAgentId: string;
  createdAt: string;
  status: "active";
  totalSpent: string | null;
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

export function TaskAgentCard({ agent }: { agent: UserAgent }) {
  return (
    <article className="group relative rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-violet-600 hover:bg-zinc-900/70">
      <Link
        href={"/jobs/agents/" + agent.userAgentId}
        aria-label={"View " + agent.name}
        className="absolute inset-0 rounded-2xl"
      />
      <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
        {agent.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {agent.capabilities.map((capability) => (
          <span
            key={capability}
            className="rounded-md border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-500"
          >
            {capability.replaceAll("-", " ")}
          </span>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-700">
          Work modes
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {agent.supportsOneTime ? (
            <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
              One-time
            </span>
          ) : null}
          {agent.supportsRecurring ? (
            <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-400">
              Recurring
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={"/jobs/new?agent=" + agent.userAgentId}
        className="relative z-10 mt-5 block rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-violet-500"
      >
        Run agent
      </Link>
    </article>
  );
}
