import { notFound } from "next/navigation";

import { EmployAgentButton } from
  "@/components/agents/employ-agent-button";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { getMarketplaceAgentBySlug } from
  "@/modules/agents/application/list-marketplace-agents";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function AgentDetailPage({ params }: Props) {
  const user = await requireCurrentUser();
  const { slug } = await params;
  const agent = await getMarketplaceAgentBySlug(user.id, slug);

  if (!agent) notFound();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <div>
          <p className="text-sm text-violet-400">Agent definition</p>
          <h1 className="mt-2 text-4xl font-bold text-white">
            {agent.name}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            {agent.description}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="font-semibold text-white">Capabilities</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
                >
                  {capability}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="font-semibold text-white">Pricing</h2>
            <p className="mt-4 text-3xl font-bold text-white">
              {agent.price} USDC
            </p>
            <p className="mt-1 text-sm text-zinc-500">per run</p>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          {agent.supportsOneTime && (
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              One-time tasks
            </span>
          )}
          {agent.supportsRecurring && (
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
              Recurring schedules
            </span>
          )}
        </div>

        <EmployAgentButton
          agentId={agent.id}
          employmentStatus={agent.employmentStatus}
          isAvailable={agent.isAvailable}
        />
      </div>
    </DashboardLayout>
  );
}
