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

Create `.env.local` for the web process:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
DATABASE_URL=
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
NEXT_PUBLIC_ARC_RPC_URL=
SETTLEMENT_PRIVATE_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
HEURIST_API_KEY=
```

`SETTLEMENT_PRIVATE_KEY` must control an address with the deployed contract's
`SETTLEMENT_ROLE`; it is read only by the worker settlement path. Never expose
it through a `NEXT_PUBLIC_` variable. Never commit environment files, Circle
recovery material, or private keys.

## Commands

```bash
npm run dev        # Next.js development server
npm run worker     # wallet provisioning and task execution worker
npm run typecheck
npm run lint
npm test
npm run build
npm run check      # all web validation
```

The worker is intentionally separate from Next.js. In local development, run
the web server and worker in different terminals.

## Database

The Drizzle schema is in `src/db/schema.ts`, and migrations are in `drizzle/`.
Migrations must be reviewed before applying them to a database containing
existing data.

## Architecture

- [Architecture and invariants](docs/architecture.md)
- [Recurring work decision](docs/decisions/0001-recurring-work.md)
- [Wallet custody decision](docs/decisions/0002-wallet-custody.md)
