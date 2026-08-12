import { config } from "dotenv";
import postgres from "postgres";

import { listAgentExecutionProfiles } from
  "../src/core/execution/agent-execution-profiles";

config({ path: [".env.local", ".env"], quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

type Finding = { issue: string; count: number };

async function main() {
  const expectedProfiles = listAgentExecutionProfiles();
  const catalog = await sql<{
    slug: string;
    is_active: boolean;
    supports_one_time: boolean;
    supports_recurring: boolean;
  }[]>`
    select slug, is_active, supports_one_time, supports_recurring
    from agents
    where slug = any(${expectedProfiles.map((profile) => profile.agentSlug)})
    order by slug
  `;

  const catalogBySlug = new Map(catalog.map((agent) => [agent.slug, agent]));
  const missingProfiles = expectedProfiles.filter(
    (profile) => !catalogBySlug.get(profile.agentSlug)?.is_active
  );
  const monitoring = catalogBySlug.get("web-monitoring-agent");

  const findings = await sql<Finding[]>`
    select 'duplicate task output' as issue, count(*)::int as count
    from (
      select task_id from task_outputs group by task_id having count(*) > 1
    ) duplicates

    union all
    select 'task with multiple running attempts', count(*)::int
    from (
      select task_id from task_attempts where status = 'running'
      group by task_id having count(*) > 1
    ) duplicates

    union all
    select 'completed task missing output', count(*)::int
    from tasks t
    where t.status = 'completed'
      and not exists (select 1 from task_outputs o where o.task_id = t.id)
  `;

  const [legacyMetadata] = await sql<{ count: number }[]>`
    select count(*)::int as count from task_outputs
    where provider is null or requested_model is null
  `;

  const latestWebRuns = await sql<{
    slug: string;
    task_id: string;
    web_search_requests: number;
    citation_count: number;
    provider_cost: string | null;
    created_at: Date;
  }[]>`
    select distinct on (a.slug)
      a.slug,
      t.id::text as task_id,
      o.web_search_requests,
      jsonb_array_length(o.citations)::int as citation_count,
      o.cost::text as provider_cost,
      o.created_at
    from task_outputs o
    join tasks t on t.id = o.task_id
    join user_agents ua on ua.id = t.user_agent_id
    join agents a on a.id = ua.agent_id
    where a.slug = any(${expectedProfiles
      .filter((profile) => profile.tools.includes("web_search"))
      .map((profile) => profile.agentSlug)})
    order by a.slug, o.created_at desc
  `;

  const queueByUser = await sql`
    select
      u.email,
      count(*) filter (where t.status = 'queued')::int as queued,
      count(*) filter (where t.status = 'running')::int as running,
      count(*) filter (
        where t.status = 'running' and t.lease_expires_at <= now()
      )::int as expired_running
    from users u
    join tasks t on t.user_id = u.id
    where t.status in ('queued', 'running')
    group by u.id, u.email
    order by running desc, queued desc
  `;

  console.log("\nApproved execution catalog");
  console.table(catalog);
  console.log("\nLatest completed web-enabled runs");
  console.table(latestWebRuns);
  console.log("\nCurrent queue by user");
  console.table(queueByUser);
  console.log("\nConsistency checks");
  console.table(findings);
  if (legacyMetadata.count > 0) {
    console.log(
      `Historical coverage: ${legacyMetadata.count} output(s) predate provider/model tracking.`
    );
  }

  const failures = findings.filter((finding) => finding.count > 0);
  if (missingProfiles.length) {
    failures.push({ issue: "missing active execution profiles", count: missingProfiles.length });
  }
  if (!monitoring || monitoring.supports_one_time || !monitoring.supports_recurring) {
    failures.push({ issue: "web monitoring work mode is incorrect", count: 1 });
  }
  const ungrounded = latestWebRuns.filter(
    (run) => run.web_search_requests < 1 || run.citation_count < 1
  );
  if (ungrounded.length) {
    failures.push({ issue: "latest web run is not grounded", count: ungrounded.length });
  }

  const testedWebSlugs = new Set(latestWebRuns.map((run) => run.slug));
  const untestedWebProfiles = expectedProfiles.filter(
    (profile) => profile.tools.includes("web_search") &&
      !testedWebSlugs.has(profile.agentSlug)
  );
  if (untestedWebProfiles.length) {
    console.log(
      `Manual coverage still required: ${untestedWebProfiles
        .map((profile) => profile.agentSlug)
        .join(", ")}`
    );
  }

  if (failures.length) {
    console.table(failures);
    throw new Error(`Phase 9 audit found ${failures.length} problem(s)`);
  }
  console.log("Phase 9 execution and scaling audit passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
