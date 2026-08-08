with charged_totals as (
  select t.recurring_job_id, sum(p.amount) as charged_amount
  from tasks t
  inner join task_payments p on p.task_id = t.id
  where t.recurring_job_id is not null and p.status = 'charged'
  group by t.recurring_job_id
)
update recurring_jobs r
set
  spent_amount = c.charged_amount,
  spending_limit = greatest(r.spending_limit, c.charged_amount),
  status = case
    when r.status = 'active'
      and c.charged_amount + r.price_per_run > greatest(r.spending_limit, c.charged_amount)
      then 'auto_paused'
    else r.status
  end,
  status_reason = case
    when r.status = 'active'
      and c.charged_amount + r.price_per_run > greatest(r.spending_limit, c.charged_amount)
      then 'Historical spending was reconciled and the limit cannot cover another run'
    else r.status_reason
  end,
  paused_at = case
    when r.status = 'active'
      and c.charged_amount + r.price_per_run > greatest(r.spending_limit, c.charged_amount)
      then now()
    else r.paused_at
  end,
  lease_owner = case
    when r.status = 'active'
      and c.charged_amount + r.price_per_run > greatest(r.spending_limit, c.charged_amount)
      then null
    else r.lease_owner
  end,
  lease_expires_at = case
    when r.status = 'active'
      and c.charged_amount + r.price_per_run > greatest(r.spending_limit, c.charged_amount)
      then null
    else r.lease_expires_at
  end,
  updated_at = now()
from charged_totals c
where r.id = c.recurring_job_id
  and r.spent_amount <> c.charged_amount;
