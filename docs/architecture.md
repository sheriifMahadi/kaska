# Kaska Architecture

## Product boundary

Kaska lets a user employ AI agents for one-time or scheduled work and pay for
each execution with USDC on Arc.

The initial product flow is:

1. A user authenticates with Clerk.
2. Kaska provisions a Circle developer-controlled wallet for that user.
3. The user deposits USDC on Arc.
4. The user employs an agent.
5. A task locks its maximum fee in escrow.
6. A separate worker executes the task.
7. Successful work charges the escrow to the Kaska treasury.
8. Failed work refunds the escrow to the user's wallet.

Recurring work is represented as scheduled, fixed-price runs. Each run creates
an independent task and escrow. Kaska does not initially support open-ended
time metering.

## Runtime boundaries

Kaska has three runtime boundaries:

- **Web application:** renders the UI and exposes authenticated HTTP handlers.
- **Worker:** provisions pending wallets, claims durable jobs, and invokes AI
  providers.
- **Arc contracts:** hold and settle task funds.

The worker must never start as a side effect of rendering or importing the
Next.js application.

## Identity and wallet lifecycle

Clerk webhooks only synchronize local identity state. They create one pending
wallet row and return without waiting for Circle. The worker provisions that
row using stable Circle idempotency keys and the Kaska user ID as Circle's
wallet `refId`.

Every attempt first lists Circle wallets by `refId`. This allows Kaska to adopt
a wallet that Circle created when an earlier response or database write was
lost. A short database lease prevents two worker instances from provisioning
the same row concurrently. Failed attempts use bounded automatic retries and
remain visible for later manual recovery.

## Source boundaries

The intended application structure is:

```text
src/
├── app/                 Next.js pages and thin HTTP handlers
├── modules/
│   ├── identity/        Clerk users and wallet provisioning
│   ├── agents/          Catalog and user employment
│   ├── wallets/         Balances, deposits, withdrawals, transactions
│   ├── tasks/           Task creation and lifecycle
│   ├── schedules/       Recurring job definitions and scheduling
│   ├── payments/        Escrow orchestration and reconciliation
│   └── execution/       Queue claims and AI execution
├── platform/
│   ├── config/          Validated runtime configuration
│   ├── database/        Database client and persistence adapters
│   ├── blockchain/      Arc client and deployed contract configuration
│   ├── circle/          Circle wallet adapter
│   └── ai/              AI provider adapters
└── components/          Shared UI and layout components
```

Refactoring will move code into these boundaries incrementally. A module owns
business rules; `app` and `platform` must not invent them.

## Financial rules

- Monetary values are stored and transported as exact decimal strings or
  integer micro-USDC, never JavaScript floating-point numbers.
- A task cannot enter the execution queue before its escrow is confirmed.
- One escrow settles at most once.
- A successful task charges only the Kaska treasury.
- A failed task refunds only the original client.
- Withdrawals may use available funds, never committed funds.
- Every external request and financial transition is idempotent and auditable.
- Database state is reconciled against confirmed Arc events.

## Wallet ledger and balances

Wallet transaction amounts are always positive. `credit` means value entered
the user's wallet and `debit` means value left it. Transactions move through
`pending`, `confirmed`, or `failed`; Circle transaction IDs, Arc transaction
hashes, and Arc log indexes provide independent duplicate protection.

The deployed escrow transfers committed USDC out of the user's wallet. Kaska
therefore reports all funds it controls for the user with this rule:

```text
Circle wallet USDC + confirmed active escrow = total controlled USDC
total controlled USDC - confirmed active escrow = available USDC
```

This avoids subtracting committed funds twice. Circle supplies the wallet
balance; confirmed active wallet locks supply the committed amount. Later
on-chain synchronization reconciles both sources against Arc events.

Withdrawals are serialized per wallet, limited to three submissions per ten
minutes, and use the same UUID in Kaska and Circle for idempotency. Pending
withdrawals reserve liquid wallet funds until transaction synchronization
marks them confirmed or failed.

The worker checks eligible pending Circle withdrawals at bounded intervals.
Circle `CONFIRMED` and `COMPLETE` states become locally confirmed; `FAILED`,
`DENIED`, `CANCELLED`, and `STUCK` become failed. Transaction hashes, block
heights, terminal timestamps, and failure details are retained for auditing.
Every thirty seconds, a broader Circle reconciliation imports missing Arc USDC
transfers and repairs incomplete local withdrawals using Circle transaction IDs
as the duplicate boundary.

## Agent catalog and employment

An agent definition describes a Kaska-owned capability, its internal execution
provider, a fixed USDC price per run, and whether it supports one-time or
scheduled runs. Scheduling never changes the billing unit into hourly billing;
each future occurrence remains an ordinary priced run.

Employment is unique per user and agent. Its lifecycle is `active` or
`archived`. Completed-task counts are derived from tasks rather than stored on
employment records. Employment creation relies on the database uniqueness
boundary, so concurrent requests can create at most one row. Archiving hides an
agent from the current workforce without deleting its task history. Employing
the same agent later reactivates that record. Only the owner may archive an
employment, and an inactive agent cannot be employed or re-employed.

Per-run, daily, and monthly limits are intentionally deferred until recurring
or delegated execution exists. Workforce spending shown to users is derived
from charged wallet locks rather than an unverified display counter.

## Task and payment lifecycle

The target lifecycle is:

```text
DRAFT
→ ESCROW_PENDING
→ FUNDS_LOCKED
→ QUEUED
→ RUNNING
→ EXECUTION_SUCCEEDED
→ CHARGE_PENDING
→ CHARGED
```

Failure paths are:

```text
ESCROW_FAILED
EXECUTION_FAILED → REFUND_PENDING → REFUNDED
MANUAL_REVIEW
```

Execution state and payment state should eventually be stored independently so
that partial failures remain visible and recoverable.

## Phase 0 rules

During the structural refactor:

- Preserve the selected visual language and useful UI components.
- Do not silently replace real behavior with mocks.
- Remove empty, duplicate, starter, insecure debug, and confirmed dead code.
- Keep route handlers thin.
- Keep external SDK calls behind adapters.
- Require TypeScript, ESLint, production build, and Foundry checks to pass.
