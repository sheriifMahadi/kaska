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

    perRunLimit: numeric("per_run_limit", {
      precision: 18,
      scale: 6,
    }),

    dailyLimit: numeric("daily_limit", {
      precision: 18,
      scale: 6,
    }),

    monthlyLimit: numeric("monthly_limit", {
      precision: 18,
      scale: 6,
    }),

    totalSpent: numeric("total_spent", {
      precision: 18,
      scale: 6,
    }).notNull().default("0"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    pausedAt: timestamp("paused_at"),
    archivedAt: timestamp("archived_at"),
  },
  (table) => ({
    userIdx: index("user_agent_user_idx").on(table.userId),
    agentIdx: index("user_agent_agent_idx").on(table.agentId),
    userAgentIdx: uniqueIndex("user_agent_unique_idx").on(
      table.userId,
      table.agentId
    ),
    statusIdx: index("user_agent_status_idx").on(
      table.userId,
      table.status
    ),
    statusCheck: check(
      "user_agent_status_check",
      sql`${table.status} in ('active', 'paused', 'archived')`
    ),
    limitsCheck: check(
      "user_agent_limits_check",
      sql`(${table.perRunLimit} is null or ${table.perRunLimit} >= 0)
        and (${table.dailyLimit} is null or ${table.dailyLimit} >= 0)
        and (${table.monthlyLimit} is null or ${table.monthlyLimit} >= 0)
        and (${table.perRunLimit} is null or ${table.dailyLimit} is null or ${table.perRunLimit} <= ${table.dailyLimit})
        and (${table.dailyLimit} is null or ${table.monthlyLimit} is null or ${table.dailyLimit} <= ${table.monthlyLimit})`
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

    // On-chain task ID used by the escrow contract
    escrowTaskId: integer("escrow_task_id").unique(),

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
    // queued | running | completed | failed

    startedAt: timestamp("started_at"),

    completedAt: timestamp("completed_at"),

    error: text("error"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("task_user_idx").on(table.userId),
    workerIdx: index("task_worker_idx").on(table.userAgentId),

    escrowTaskIdx: index("task_escrow_task_idx").on(
      table.escrowTaskId
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

    tokens: numeric("tokens"),

    cost: numeric("cost", {
      precision: 10,
      scale: 6,
    }),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskIdx: index("task_output_task_idx").on(table.taskId),
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
    .references(() => tasks.id, {
      onDelete: "cascade",
    }),

  // On-chain escrow ID
  escrowTaskId: integer("escrow_task_id").notNull(),

  // Transaction that created the lock
  txHash: text("tx_hash"),

  amount: decimal("amount", {
    precision: 18,
    scale: 6,
  }).notNull(),

  status: text("status")
    .$type<"ACTIVE" | "RELEASED" | "CHARGED" | "CANCELLED">()
    .notNull()
    .default("ACTIVE"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  expiresAt: timestamp("expires_at"),

  releasedAt: timestamp("released_at"),
});
