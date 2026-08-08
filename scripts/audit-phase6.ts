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

type Finding = {
  issue: string;
  count: number;
};

async function main() {
  const findings = await sql<Finding[]>`
    select 'active payment without active lock' as issue, count(*)::int as count
    from task_payments p
    where p.status in ('locked', 'charge_pending', 'refund_pending')
      and not exists (
        select 1 from wallet_locks l
        where l.task_id = p.task_id and l.status = 'ACTIVE'
      )

    union all

    select 'charged payment without charged lock', count(*)::int
    from task_payments p
    where p.status = 'charged'
      and not exists (
        select 1 from wallet_locks l
        where l.task_id = p.task_id and l.status = 'CHARGED'
      )

    union all

    select 'reserved funds on a terminal payment', count(*)::int
    from wallet_locks l
    join task_payments p on p.task_id = l.task_id
    where l.status = 'RESERVED'
      and p.status in ('charged', 'refunded', 'failed')

    union all

    select 'execution started before funds locked', count(*)::int
    from tasks t
    join task_payments p on p.task_id = t.id
    where t.status in ('queued', 'running', 'completed')
      and p.status in ('approval_pending', 'escrow_pending', 'failed')

    union all

    select 'successful execution awaiting no charge', count(*)::int
    from tasks t
    join task_payments p on p.task_id = t.id
    where t.status = 'completed'
      and p.status not in ('locked', 'charge_pending', 'charged', 'refund_pending', 'refunded', 'manual_review')

    union all

    select 'duplicate task outputs', count(*)::int
    from (
      select task_id from task_outputs group by task_id having count(*) > 1
    ) duplicates

    union all

    select 'incomplete payment lease', count(*)::int
    from task_payments
    where (processing_owner is null) <> (processing_lease_expires_at is null)
  `;

  const failures = findings.filter((finding) => finding.count > 0);
  console.table(findings);
  if (failures.length > 0) {
    throw new Error(
      `Phase 6 audit found ${failures.length} consistency problem(s)`
    );
  }
  console.log("Phase 6 consistency audit passed.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
