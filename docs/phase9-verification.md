# Phase 9 verification

Use testnet wallets and a dedicated OpenRouter key with a spending limit.

## Automated baseline

```bash
npm run check
npm run audit:phase9
```

The audit is read-only. It checks the approved catalog, duplicate outputs,
simultaneous attempts, model/provider records, the most recent grounded web
runs, and queue distribution.

## Multi-worker manual test

Do not run the all-in-one worker during this test. Start the web app, scheduler,
financial workers, and two task replicas:

```bash
npm run dev
npm run scheduler
npm run worker:payments
npm run worker:wallets
WORKER_INSTANCE_ID=task-a TASK_WORKER_CONCURRENCY=2 npm run worker:tasks
WORKER_INSTANCE_ID=task-b TASK_WORKER_CONCURRENCY=2 npm run worker:tasks
```

From two Clerk accounts, queue at least three jobs per account. Include Research,
Content, Web Scraper, Crypto Research, and one recurring Web Monitoring job.

Expected results:

- at most four AI jobs run simultaneously;
- both users receive slots before either user consumes every slot;
- every task has one output and never has two running attempts;
- web-enabled jobs contain citations and at least one recorded search;
- content work records zero searches;
- successful jobs record requested/returned models, tokens, latency, and cost;
- stopping one task replica does not stop the other;
- a force-killed running replica leaves a lease that another replica recovers;
- successful work charges once and terminal failure refunds once.

After the jobs settle, rerun `npm run audit:phase9` and inspect OpenRouter Activity
to reconcile request count and provider spend.
