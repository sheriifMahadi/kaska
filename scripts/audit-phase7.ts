import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
type Finding = { issue: string; count: number };

async function main() {
  const findings = await sql<Finding[]>`
    select 'active schedule without next run' as issue, count(*)::int as count
    from recurring_jobs where status = 'active' and next_run_at is null
    union all
    select 'inactive schedule retains a lease', count(*)::int
    from recurring_jobs where status <> 'active'
      and (lease_owner is not null or lease_expires_at is not null)
    union all
    select 'recurring task without occurrence', count(*)::int
    from tasks t where t.recurring_job_id is not null
      and not exists (select 1 from recurring_job_occurrences o where o.task_id = t.id)
    union all
    select 'occurrence task belongs to another schedule', count(*)::int
    from recurring_job_occurrences o join tasks t on t.id = o.task_id
    where t.recurring_job_id <> o.recurring_job_id
    union all
    select 'more than one unsettled run for a schedule', count(*)::int
    from (
      select t.recurring_job_id
      from tasks t join task_payments p on p.task_id = t.id
      where t.recurring_job_id is not null
        and p.status in ('approval_pending', 'escrow_pending', 'locked', 'charge_pending', 'refund_pending', 'manual_review')
      group by t.recurring_job_id having count(*) > 1
    ) unsettled_groups
    union all
    select 'recorded spending differs from charged runs', count(*)::int
    from recurring_jobs r where r.spent_amount <> coalesce((
      select sum(p.amount) from tasks t join task_payments p on p.task_id = t.id
      where t.recurring_job_id = r.id and p.status = 'charged'
    ), 0)
    union all
    select 'recorded spending exceeds limit', count(*)::int
    from recurring_jobs where spent_amount > spending_limit
  `;
  console.table(findings);
  const failures = findings.filter((finding) => finding.count > 0);
  if (failures.length) {
    throw new Error(`Phase 7 audit found ${failures.length} consistency problem(s)`);
  }
  console.log("Phase 7 consistency audit passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => sql.end());
