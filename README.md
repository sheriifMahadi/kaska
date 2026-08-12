# Kaska Web

Kaska is an AI workforce application where users employ agents for one-time or
scheduled work and pay for each execution with USDC on Arc.

## Current baseline

The repository currently contains:

- Clerk authentication and user synchronization;
- Circle developer-controlled wallet provisioning;
- an agent catalog and employment records;
- task persistence and a polling execution worker;
- OpenRouter, OpenAI, and Heurist provider adapters;
- Arc wallet balance and withdrawal integration;
- a durable per-task Arc USDC escrow and settlement lifecycle;
- the selected dashboard, workforce, task, and wallet UI.

The current deployment is testnet-only. Its deployer key is also the initial
settlement key; rotate the contract role to an isolated operator before
production. See [docs/architecture.md](docs/architecture.md).

## Requirements

- Node.js 20.9 or newer (`nvm use` reads the included `.nvmrc`)
- PostgreSQL
- Clerk application and webhook
- Circle developer-controlled-wallet credentials
- Arc testnet RPC and a worker-only settlement signer
- At least one configured AI provider
- Foundry for contract development

## Configuration

Copy `.env.example` to `.env.local` for local development. For Vercel, add the
same values through project settings; never upload an environment file. The
Vercel application also hosts the bounded task, payment, wallet, and scheduler
handlers, so it needs the OpenRouter, settlement, and QStash secrets at runtime.

Use Supabase's transaction-mode pooler URL for `DATABASE_URL` and set
`DATABASE_POOL_MAX=1`. `OPENAI_API_KEY` and `HEURIST_API_KEY` remain optional
unless an execution profile uses those providers. `ARC_RPC_URL` is server-only;
the older `NEXT_PUBLIC_ARC_RPC_URL` remains supported for local compatibility.

`INTERNAL_WORKER_SECRET` protects the bounded serverless worker routes under
`/api/internal/workers/*`. Generate a long random value and never expose it
through a `NEXT_PUBLIC_` variable. QStash signature verification will replace
direct bearer authentication for external delivery; this secret remains useful
for local smoke tests and emergency manual invocation.

For serverless delivery, configure
`QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and
`QSTASH_NEXT_SIGNING_KEY`. Set `APP_URL` to the canonical HTTPS Vercel URL.
Production worker routes reject the local bearer secret and accept only valid
QStash signatures. After adding the values locally, run `npm run setup:qstash`
after deployment to create the task queue and shared reconciliation schedules.
See [the Vercel deployment guide](docs/deployment-vercel.md).

For testing, use a dedicated OpenRouter API key with a provider-enforced
spending limit. Kaska records the cost returned for each successful OpenRouter
execution, but the API-key limit is the hard stop that also covers failed or
concurrent requests.

To enable the temporary one-time Arc Testnet grant, set
`TEST_TOKEN_CLAIMS_ENABLED=true` and provide the Circle wallet ID of a dedicated,
funded distribution wallet in `TEST_TOKEN_SOURCE_WALLET_ID`. Never use the
treasury or settlement wallet as the distribution wallet.

`SETTLEMENT_PRIVATE_KEY` must control an address with the deployed contract's
`SETTLEMENT_ROLE`; it is read only by the worker settlement path. Never expose
it through a `NEXT_PUBLIC_` variable. Never commit environment files, Circle
recovery material, or private keys.

## Commands

```bash
npm run dev        # Next.js development server
npm run worker     # all background roles, including the scheduler
npm run service:web        # standalone production web service (uses PORT)
npm run service:background # background service with health endpoint
npm run worker:tasks    # task claiming and AI execution only
npm run worker:payments # escrow confirmation and settlement only
npm run worker:wallets  # wallet provisioning and transaction sync only
npm run typecheck
npm run lint
npm test
npm run build
npm run db:migrate # apply reviewed Drizzle migrations explicitly
npm run check      # all web validation
```

## Deployment

The selected testnet deployment is Vercel + QStash + Supabase. Vercel serves
the application and bounded worker endpoints; QStash wakes those endpoints,
controls delivery, and retries failures. Do not deploy or run the continuous
background worker beside this setup.

## Optional container images

The earlier two-service container setup remains available as a future escape
hatch:

- Web: `Dockerfile.web`, port `3000`, health path `/api/health`. Supply
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` as a build argument and as a runtime
  variable.
- Background: `Dockerfile.background`, port `8080`, health path `/ready`.

Both images run as non-root users. The web image uses Next.js standalone output;
the background image does not contain Clerk secrets or Next.js build output.
Real `.env` files and Circle recovery material are excluded from Docker build
contexts by `.dockerignore`.

In container mode, `npm run worker` runs all four background responsibilities in
one process. Do not run it alongside the role-specific commands or alongside
the Vercel/QStash production deployment.

Task workers are stateless replicas sharing the PostgreSQL queue. Give each
replica a recognizable `WORKER_INSTANCE_ID`; its unique lease ID is recorded in
`task_attempts.worker_id`. `TASK_WORKER_CONCURRENCY` controls slots per replica
and is constrained to 1-16. For example, three replicas with four slots provide
up to twelve concurrent AI executions:

```bash
WORKER_INSTANCE_ID=task-a TASK_WORKER_CONCURRENCY=4 npm run worker:tasks
WORKER_INSTANCE_ID=task-b TASK_WORKER_CONCURRENCY=4 npm run worker:tasks
WORKER_INSTANCE_ID=task-c TASK_WORKER_CONCURRENCY=4 npm run worker:tasks
```

Scale gradually within the AI provider's request limits and the database's
connection capacity. On shutdown, a replica stops claiming work and waits for
its active tasks to finish; expired leases remain recoverable if it crashes.

## Database

The Drizzle schema is in `src/db/schema.ts`, and migrations are in `drizzle/`.
Migrations must be reviewed before applying them to a database containing
existing data.

## Architecture

- [Architecture and invariants](docs/architecture.md)
- [Recurring work decision](docs/decisions/0001-recurring-work.md)
- [Wallet custody decision](docs/decisions/0002-wallet-custody.md)
