import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
});

type Finding = { issue: string; count: number };

async function main() {
  const findings = await sql<Finding[]>`
    select 'task owned by a different employment user' as issue, count(*)::int as count
    from tasks t
    join user_agents ua on ua.id = t.user_agent_id
    where t.user_id <> ua.user_id

    union all
    select 'schedule owned by a different employment user', count(*)::int
    from recurring_jobs r
    join user_agents ua on ua.id = r.user_agent_id
    where r.user_id <> ua.user_id

    union all
    select 'task payment uses another user wallet', count(*)::int
    from task_payments p
    join tasks t on t.id = p.task_id
    join wallets w on w.id = p.wallet_id
    where t.user_id <> w.user_id

    union all
    select 'wallet transaction assigned to another user', count(*)::int
    from wallet_transactions wt
    join wallets w on w.id = wt.wallet_id
    where wt.user_id <> w.user_id

    union all
    select 'charged payment missing settlement time', count(*)::int
    from task_payments
    where status = 'charged' and settled_at is null

    union all
    select 'completed task missing completion time', count(*)::int
    from tasks
    where status = 'completed' and completed_at is null

    union all
    select 'duplicate task output', count(*)::int
    from (
      select task_id from task_outputs group by task_id having count(*) > 1
    ) duplicates
  `;

  const totals = await sql`
    select
      u.id as user_id,
      u.email,
      count(distinct ua.id) filter (where ua.status = 'active')::int as active_agents,
      count(distinct r.id) filter (where r.status = 'active')::int as active_schedules,
      count(distinct t.id) filter (where t.status = 'running')::int as running_tasks,
      count(distinct t.id) filter (where t.status = 'completed')::int as completed_tasks,
      count(distinct t.id) filter (where t.status = 'failed')::int as failed_tasks,
      coalesce((
        select sum(p.amount)
        from task_payments p
        join tasks paid_task on paid_task.id = p.task_id
        where paid_task.user_id = u.id and p.status = 'charged'
      ), 0)::text as charged_usdc
    from users u
    left join user_agents ua on ua.user_id = u.id
    left join recurring_jobs r on r.user_id = u.id
    left join tasks t on t.user_id = u.id
    where u.status = 'active'
    group by u.id, u.email
    order by u.created_at
  `;

  console.log("\nDashboard totals (all time)");
  console.table(totals);
  console.log("\nConsistency checks");
  console.table(findings);

  const failures = findings.filter((finding) => finding.count > 0);
  if (failures.length > 0) {
    throw new Error(`Phase 8 audit found ${failures.length} consistency problem(s)`);
  }

  console.log("Phase 8 dashboard reconciliation passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
