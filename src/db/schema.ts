import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  numeric,
  boolean,
  integer,
  decimal,
  jsonb,
  bigint,
  uniqueIndex,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  SecurityEventOutcome,
  UserStatus,
  WalletProvisioningStatus,
  WebhookProcessingStatus,
} from "@/modules/identity/domain/wallet-provisioning";
import type {
  TaskPriority,
  TaskStatus,
} from "@/modules/tasks/domain/task-status";
import type {
  WalletTransactionDirection,
  WalletTransactionSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from "@/modules/wallets/domain/wallet-transaction";
import type {
  AgentExecutionProvider,
  AgentPricingType,
  EmploymentStatus,
} from "@/modules/agents/domain/agent";
import type {
  TaskPaymentStatus,
  TaskSettlementKind,
  TaskPaymentAttemptKind,
  TaskPaymentAttemptStatus,
} from "@/modules/payments/domain/task-payment";
import type { RecurringJobStatus } from
  "@/modules/schedules/domain/recurring-job";

/* ---------------------------
   USERS
---------------------------- */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  clerkId: text("clerk_id").notNull().unique(),

  email: text("email").notNull(),
  name: text("name"),
  imageUrl: text("image_url"),

  status: text("status")
    .$type<UserStatus>()
    .notNull()
    .default("active"),

  deletedAt: timestamp("deleted_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ---------------------------
   WALLETS
---------------------------- */
export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    circleWalletId: text("circle_wallet_id").unique(),

    circleWalletSetId: text("circle_wallet_set_id").unique(),

    address: text("address"),

    status: text("status")
      .$type<WalletProvisioningStatus>()
      .notNull()
      .default("pending"),

    walletSetIdempotencyKey: uuid("wallet_set_idempotency_key")
      .defaultRandom()
      .notNull()
      .unique(),

    walletIdempotencyKey: uuid("wallet_idempotency_key")
      .defaultRandom()
      .notNull()
      .unique(),

    provisioningAttempts: integer("provisioning_attempts")
      .notNull()
      .default(0),

    lastProvisioningError: text("last_provisioning_error"),

    lastCircleRequestId: uuid("last_circle_request_id"),

    provisioningStartedAt: timestamp("provisioning_started_at"),

    nextProvisioningAttemptAt: timestamp(
      "next_provisioning_attempt_at"
    ),

    provisionedAt: timestamp("provisioned_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("wallet_user_idx").on(table.userId),
    provisioningIdx: index("wallet_provisioning_idx").on(
      table.status,
      table.nextProvisioningAttemptAt
    ),
  })
);

/* ---------------------------
   WALLET TRANSACTIONS
---------------------------- */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    type: text("type")
      .$type<WalletTransactionType>()
      .notNull(),

    direction: text("direction")
      .$type<WalletTransactionDirection>()
      .notNull(),

    status: text("status")
      .$type<WalletTransactionStatus>()
      .notNull()
      .default("pending"),

    amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),

    currency: text("currency")
      .$type<"USDC">()
      .notNull()
      .default("USDC"),

    circleTransactionId: text("circle_transaction_id"),

    idempotencyKey: uuid("idempotency_key"),

    txHash: text("tx_hash"),

    chainLogIndex: integer("chain_log_index"),

    blockNumber: bigint("block_number", { mode: "number" }),

    fromAddress: text("from_address"),

    toAddress: text("to_address"),

    error: text("error"),

    source: text("source")
      .$type<WalletTransactionSource>()
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    confirmedAt: timestamp("confirmed_at"),

    failedAt: timestamp("failed_at"),
  },
  (table) => ({
    walletIdx: index("wallet_tx_wallet_idx").on(table.walletId),
    userIdx: index("wallet_tx_user_idx").on(table.userId),
    userCreatedIdx: index("wallet_tx_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
    statusIdx: index("wallet_tx_status_idx").on(table.status),
    circleTransactionIdx: uniqueIndex(
      "wallet_tx_circle_transaction_idx"
    ).on(table.circleTransactionId),
    idempotencyIdx: uniqueIndex("wallet_tx_idempotency_idx").on(
      table.idempotencyKey
    ),
    chainEventIdx: uniqueIndex("wallet_tx_chain_event_idx").on(
      table.txHash,
      table.chainLogIndex
    ),
    positiveAmountCheck: check(
      "wallet_tx_positive_amount_check",
      sql`${table.amount} > 0`
    ),
    directionCheck: check(
      "wallet_tx_direction_check",
      sql`(${table.type} = 'deposit' AND ${table.direction} = 'credit') OR (${table.type} = 'withdrawal' AND ${table.direction} = 'debit')`
    ),
  })
);

/* ---------------------------
   CLERK WEBHOOK RECEIPTS
---------------------------- */
export const clerkWebhookEvents = pgTable(
  "clerk_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    clerkEventId: text("clerk_event_id").notNull().unique(),

    eventType: text("event_type").notNull(),

    status: text("status")
      .$type<WebhookProcessingStatus>()
      .notNull()
      .default("processing"),

    attempts: integer("attempts").notNull().default(1),

    lastError: text("last_error"),

    receivedAt: timestamp("received_at").defaultNow().notNull(),

    processedAt: timestamp("processed_at"),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("clerk_webhook_status_idx").on(table.status),
  })
);

/* ---------------------------
   SECURITY EVENTS
---------------------------- */
export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    clerkId: text("clerk_id"),

    eventType: text("event_type").notNull(),

    outcome: text("outcome")
      .$type<SecurityEventOutcome>()
      .notNull(),

    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("security_event_user_idx").on(table.userId),
    clerkIdx: index("security_event_clerk_idx").on(table.clerkId),
    typeIdx: index("security_event_type_idx").on(table.eventType),
  })
);


export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    capabilities: jsonb("capabilities")
      .$type<string[]>()
      .notNull()
      .default([]),
    executionProvider: text("execution_provider")
      .$type<AgentExecutionProvider>()
      .notNull(),
    pricingType: text("pricing_type")
      .$type<AgentPricingType>()
      .notNull()
      .default("fixed_per_run"),
    price: numeric("price", { precision: 18, scale: 6 }).notNull(),
    supportsOneTime: boolean("supports_one_time")
      .notNull()
      .default(true),
    supportsRecurring: boolean("supports_recurring")
      .notNull()
      .default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("agent_slug_idx").on(table.slug),
    activeIdx: index("agent_active_idx").on(table.isActive),
    priceCheck: check(
      "agent_active_price_check",
      sql`not ${table.isActive} or ${table.price} > 0`
    ),
    scheduleCheck: check(
      "agent_schedule_support_check",
      sql`${table.supportsOneTime} or ${table.supportsRecurring}`
    ),
  })
);

export const userAgents = pgTable(
  "user_agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, {
        onDelete: "cascade",
      }),

    status: text("status")
      .$type<EmploymentStatus>()
      .notNull()
      .default("active"),

    totalSpent: numeric("total_spent", {
      precision: 18,
      scale: 6,
    }).notNull().default("0"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => ({
    userIdx: index("user_agent_user_idx").on(table.userId),
    agentIdx: index("user_agent_agent_idx").on(table.agentId),
    userAgentIdx: uniqueIndex("user_agent_unique_idx").on(
      table.userId,
      table.agentId
    ),
    idUserIdx: uniqueIndex("user_agent_id_user_idx").on(
      table.id,
      table.userId
    ),
    statusIdx: index("user_agent_status_idx").on(
      table.userId,
      table.status
    ),
    statusCheck: check(
      "user_agent_status_check",
      sql`${table.status} in ('active', 'archived')`
    ),
  })
);

export const recurringJobs = pgTable(
  "recurring_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgentId: uuid("user_agent_id").notNull(),
    name: text("name").notNull(),
    instructions: text("instructions").notNull(),
    status: text("status")
      .$type<RecurringJobStatus>()
      .notNull()
      .default("active"),
    intervalMinutes: integer("interval_minutes").notNull(),
    pricePerRun: decimal("price_per_run", {
      precision: 18,
      scale: 6,
    }).notNull(),
    spendingLimit: decimal("spending_limit", {
      precision: 18,
      scale: 6,
    }).notNull(),
    spentAmount: decimal("spent_amount", {
      precision: 18,
      scale: 6,
    }).notNull().default("0"),
    runCount: integer("run_count").notNull().default(0),
    consecutiveFailures: integer("consecutive_failures")
      .notNull()
      .default(0),
    missedRunCount: integer("missed_run_count").notNull().default(0),
    timezone: text("timezone").notNull(),
    startsAt: timestamp("starts_at").defaultNow().notNull(),
    endsAt: timestamp("ends_at"),
    nextRunAt: timestamp("next_run_at"),
    lastRunAt: timestamp("last_run_at"),
    statusReason: text("status_reason"),
    pausedAt: timestamp("paused_at"),
    cancelledAt: timestamp("cancelled_at"),
    completedAt: timestamp("completed_at"),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    ownerIdx: index("recurring_job_owner_idx").on(
      table.userId,
      table.status
    ),
    dueIdx: index("recurring_job_due_idx").on(
      table.status,
      table.nextRunAt
    ),
    leaseIdx: index("recurring_job_lease_idx").on(
      table.leaseExpiresAt
    ),
    employmentOwnerFk: foreignKey({
      columns: [table.userAgentId, table.userId],
      foreignColumns: [userAgents.id, userAgents.userId],
      name: "recurring_job_employment_owner_fk",
    }).onDelete("cascade"),
    statusCheck: check(
      "recurring_job_status_check",
      sql`${table.status} in ('active', 'paused', 'auto_paused', 'completed', 'cancelled')`
    ),
    intervalCheck: check(
      "recurring_job_interval_check",
      sql`${table.intervalMinutes} between 1 and 43200`
    ),
    priceCheck: check(
      "recurring_job_price_check",
      sql`${table.pricePerRun} > 0`
    ),
    spendingCheck: check(
      "recurring_job_spending_check",
      sql`${table.spendingLimit} >= ${table.pricePerRun} and ${table.spentAmount} >= 0 and ${table.spentAmount} <= ${table.spendingLimit}`
    ),
    countersCheck: check(
      "recurring_job_counters_check",
      sql`${table.runCount} >= 0 and ${table.consecutiveFailures} >= 0 and ${table.missedRunCount} >= 0`
    ),
    dateRangeCheck: check(
      "recurring_job_date_range_check",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`
    ),
  })
);
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    userAgentId: uuid("user_agent_id")
      .notNull()
      .references(() => userAgents.id, {
        onDelete: "cascade",
      }),

    recurringJobId: uuid("recurring_job_id")
      .references(() => recurringJobs.id, { onDelete: "set null" }),

    scheduledFor: timestamp("scheduled_for"),

    // On-chain task ID used by the escrow contract
    escrowTaskId: text("escrow_task_id").unique(),

    title: text("title").notNull(),

    prompt: text("prompt").notNull(),

    priority: text("priority")
      .$type<TaskPriority>()
      .notNull()
      .default("normal"),

    status: text("status")
      .$type<TaskStatus>()
      .notNull()
      .default("queued"),

    attemptCount: integer("attempt_count").notNull().default(0),

    maxAttempts: integer("max_attempts").notNull().default(3),

    queuedAt: timestamp("queued_at").defaultNow().notNull(),

    startedAt: timestamp("started_at"),

    completedAt: timestamp("completed_at"),

    failedAt: timestamp("failed_at"),

    cancelledAt: timestamp("cancelled_at"),

    error: text("error"),

    errorCode: text("error_code"),

    leaseOwner: text("lease_owner"),

    leaseExpiresAt: timestamp("lease_expires_at"),

    lastHeartbeatAt: timestamp("last_heartbeat_at"),

    executionProvider: text("execution_provider")
      .$type<AgentExecutionProvider>(),

    executionModel: text("execution_model"),

    lastExecutionLatencyMs: integer("last_execution_latency_ms"),

    nextAttemptAt: timestamp("next_attempt_at"),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("task_user_idx").on(table.userId),
    userRunningIdx: index("task_user_running_idx").on(
      table.userId,
      table.status,
      table.leaseExpiresAt
    ),
    workerIdx: index("task_worker_idx").on(table.userAgentId),

    statusCreatedIdx: index("task_status_created_idx").on(
      table.status,
      table.createdAt
    ),

    leaseIdx: index("task_lease_idx").on(
      table.status,
      table.leaseExpiresAt
    ),

    retryIdx: index("task_retry_idx").on(
      table.status,
      table.nextAttemptAt
    ),

    statusCheck: check(
      "task_status_check",
      sql`${table.status} in ('draft', 'queued', 'running', 'completed', 'failed', 'cancelled', 'manual_review')`
    ),

    attemptsCheck: check(
      "task_attempts_check",
      sql`${table.attemptCount} >= 0 and ${table.maxAttempts} > 0 and ${table.attemptCount} <= ${table.maxAttempts}`
    ),

    escrowTaskIdx: index("task_escrow_task_idx").on(
      table.escrowTaskId
    ),
    recurringJobIdx: index("task_recurring_job_idx").on(
      table.recurringJobId,
      table.createdAt
    ),
    recurringOccurrenceIdx: uniqueIndex(
      "task_recurring_occurrence_idx"
    ).on(table.recurringJobId, table.scheduledFor),
    recurringFieldsCheck: check(
      "task_recurring_fields_check",
      sql`(${table.recurringJobId} is null and ${table.scheduledFor} is null) or (${table.recurringJobId} is not null and ${table.scheduledFor} is not null)`
    ),
  })
);

export const recurringJobOccurrences = pgTable(
  "recurring_job_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recurringJobId: uuid("recurring_job_id")
      .notNull()
      .references(() => recurringJobs.id, { onDelete: "cascade" }),
    scheduledFor: timestamp("scheduled_for").notNull(),
    status: text("status")
      .$type<"task_created" | "skipped_overlap" | "skipped_missed" | "skipped_limit">()
      .notNull(),
    taskId: uuid("task_id")
      .unique()
      .references(() => tasks.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    occurrenceIdx: uniqueIndex("recurring_job_occurrence_idx").on(
      table.recurringJobId,
      table.scheduledFor
    ),
    jobTimeIdx: index("recurring_job_occurrence_time_idx").on(
      table.recurringJobId,
      table.scheduledFor
    ),
    statusCheck: check(
      "recurring_job_occurrence_status_check",
      sql`${table.status} in ('task_created', 'skipped_overlap', 'skipped_missed', 'skipped_limit')`
    ),
    taskCheck: check(
      "recurring_job_occurrence_task_check",
      sql`(${table.status} = 'task_created' and ${table.taskId} is not null) or (${table.status} in ('skipped_overlap', 'skipped_missed', 'skipped_limit') and ${table.taskId} is null)`
    ),
  })
);

export const taskAttempts = pgTable(
  "task_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    workerId: text("worker_id").notNull(),
    status: text("status")
      .$type<"running" | "completed" | "failed" | "abandoned">()
      .notNull()
      .default("running"),
    provider: text("provider").$type<AgentExecutionProvider>(),
    requestedModel: text("requested_model"),
    model: text("model"),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryable: boolean("retryable"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => ({
    taskIdx: index("task_attempt_task_idx").on(table.taskId),
    taskAttemptIdx: uniqueIndex("task_attempt_unique_idx").on(
      table.taskId,
      table.attemptNumber
    ),
    statusCheck: check(
      "task_attempt_status_check",
      sql`${table.status} in ('running', 'completed', 'failed', 'abandoned')`
    ),
    numberCheck: check(
      "task_attempt_number_check",
      sql`${table.attemptNumber} > 0`
    ),
  })
);

export const taskOutputs = pgTable(
  "task_outputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "cascade",
      }),

    output: text("output").notNull(),

    model: text("model"),

    requestedModel: text("requested_model"),

    provider: text("provider").$type<AgentExecutionProvider>(),

    inputTokens: integer("input_tokens"),

    outputTokens: integer("output_tokens"),

    tokens: numeric("tokens"),

    latencyMs: integer("latency_ms"),

    finishReason: text("finish_reason"),

    webSearchRequests: integer("web_search_requests").notNull().default(0),

    citations: jsonb("citations")
      .$type<Array<{ title: string; url: string }>>()
      .notNull()
      .default([]),

    format: text("format").notNull().default("markdown_v1"),

    cost: numeric("cost", {
      precision: 10,
      scale: 6,
    }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskIdx: uniqueIndex("task_output_task_idx").on(table.taskId),
  })
);

export const taskPayments = pgTable(
  "task_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .unique()
      .references(() => tasks.id, { onDelete: "cascade" }),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    escrowId: text("escrow_id").notNull().unique(),
    amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
    status: text("status")
      .$type<TaskPaymentStatus>()
      .notNull()
      .default("approval_pending"),
    approvalIdempotencyKey: uuid("approval_idempotency_key")
      .notNull()
      .unique(),
    approvalCircleTransactionId: text(
      "approval_circle_transaction_id"
    ).unique(),
    approvalTxHash: text("approval_tx_hash"),
    escrowIdempotencyKey: uuid("escrow_idempotency_key")
      .notNull()
      .unique(),
    escrowCircleTransactionId: text(
      "escrow_circle_transaction_id"
    ).unique(),
    escrowTxHash: text("escrow_tx_hash"),
    settlementKind: text("settlement_kind")
      .$type<TaskSettlementKind>(),
    settlementIdempotencyKey: uuid("settlement_idempotency_key")
      .notNull()
      .unique(),
    settlementTxHash: text("settlement_tx_hash"),
    processingOwner: text("processing_owner"),
    processingLeaseExpiresAt: timestamp("processing_lease_expires_at"),
    chainReconciledAt: timestamp("chain_reconciled_at"),
    errorCode: text("error_code"),
    error: text("error"),
    lockedAt: timestamp("locked_at"),
    settledAt: timestamp("settled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("task_payment_status_idx").on(
      table.status,
      table.updatedAt
    ),
    walletIdx: index("task_payment_wallet_idx").on(table.walletId),
    processingLeaseIdx: index("task_payment_processing_lease_idx").on(
      table.processingLeaseExpiresAt
    ),
    chainReconciledIdx: index("task_payment_chain_reconciled_idx").on(
      table.chainReconciledAt
    ),
    statusCheck: check(
      "task_payment_status_check",
      sql`${table.status} in ('approval_pending', 'escrow_pending', 'locked', 'charge_pending', 'charged', 'refund_pending', 'refunded', 'failed', 'manual_review')`
    ),
    settlementKindCheck: check(
      "task_payment_settlement_kind_check",
      sql`${table.settlementKind} is null or ${table.settlementKind} in ('charge', 'refund')`
    ),
    amountCheck: check(
      "task_payment_positive_amount_check",
      sql`${table.amount} > 0`
    ),
  })
);

export const taskPaymentAttempts = pgTable(
  "task_payment_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskPaymentId: uuid("task_payment_id")
      .notNull()
      .references(() => taskPayments.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    kind: text("kind").$type<TaskPaymentAttemptKind>().notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    status: text("status")
      .$type<TaskPaymentAttemptStatus>()
      .notNull()
      .default("prepared"),
    idempotencyKey: uuid("idempotency_key").notNull().unique(),
    provider: text("provider").$type<"circle" | "operator">().notNull(),
    circleTransactionId: text("circle_transaction_id").unique(),
    txHash: text("tx_hash"),
    blockNumber: bigint("block_number", { mode: "number" }),
    errorCode: text("error_code"),
    error: text("error"),
    preparedAt: timestamp("prepared_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    confirmedAt: timestamp("confirmed_at"),
    failedAt: timestamp("failed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    paymentIdx: index("task_payment_attempt_payment_idx").on(
      table.taskPaymentId,
      table.preparedAt
    ),
    taskIdx: index("task_payment_attempt_task_idx").on(
      table.taskId,
      table.preparedAt
    ),
    statusIdx: index("task_payment_attempt_status_idx").on(
      table.status,
      table.updatedAt
    ),
    kindAttemptIdx: uniqueIndex("task_payment_attempt_kind_number_idx").on(
      table.taskPaymentId,
      table.kind,
      table.attemptNumber
    ),
    kindCheck: check(
      "task_payment_attempt_kind_check",
      sql`${table.kind} in ('approval', 'escrow', 'charge', 'refund')`
    ),
    statusCheck: check(
      "task_payment_attempt_status_check",
      sql`${table.status} in ('prepared', 'submitted', 'pending', 'confirmed', 'failed', 'reconciled')`
    ),
    providerCheck: check(
      "task_payment_attempt_provider_check",
      sql`${table.provider} in ('circle', 'operator')`
    ),
    attemptNumberCheck: check(
      "task_payment_attempt_number_check",
      sql`${table.attemptNumber} > 0`
    ),
  })
);

export const walletLocks = pgTable("wallet_locks", {
  id: uuid("id").defaultRandom().primaryKey(),

  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, {
      onDelete: "cascade",
    }),

  taskId: uuid("task_id")
    .notNull()
    .unique()
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),

  // On-chain escrow ID
  escrowTaskId: text("escrow_task_id").notNull(),

  // Transaction that created the lock
  txHash: text("tx_hash"),

  amount: decimal("amount", {
    precision: 18,
    scale: 6,
  }).notNull(),

  status: text("status")
    .$type<"RESERVED" | "ACTIVE" | "RELEASED" | "CHARGED" | "CANCELLED">()
    .notNull()
    .default("ACTIVE"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  expiresAt: timestamp("expires_at"),

  releasedAt: timestamp("released_at"),
});
