# Kaska Architecture

## Product boundary

Kaska lets a user employ AI agents for one-time or scheduled work and pay for
each execution with USDC on Arc.

The initial product flow is:

1. A user authenticates with Clerk.
2. Kaska provisions a Circle developer-controlled wallet for that user.
3. The user deposits USDC on Arc.
4. The user employs an agent and defines spending limits.
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
- **Worker:** claims durable jobs and invokes AI providers.
- **Arc contracts:** hold and settle task funds.

The worker must never start as a side effect of rendering or importing the
Next.js application.

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

