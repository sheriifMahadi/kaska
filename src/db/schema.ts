import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  numeric,
  boolean,
  integer,
  decimal
} from "drizzle-orm/pg-core";

/* ---------------------------
   USERS
---------------------------- */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  clerkId: text("clerk_id").notNull().unique(),

  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at").defaultNow(),
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

    circleWalletId: text("circle_wallet_id").notNull(),

    circleWalletSetId: text("circle_wallet_set_id").notNull().unique(),

    address: text("address"),

    status: text("status").notNull().default("active"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("wallet_user_idx").on(table.userId),
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

    type: text("type").notNull(),

    amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),

    currency: text("currency").notNull().default("USDC"),

    referenceId: text("reference_id"),

    source: text("source").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: index("wallet_tx_wallet_idx").on(table.walletId),
    userIdx: index("wallet_tx_user_idx").on(table.userId),
  })
);


export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  type: text("type").notNull(),
  // research | content | seo | social

  // pricing model (IMPORTANT)
  pricingModel: text("pricing_model").notNull(),
  // "task" | "hour"

  // per-task pricing (USDC)
  taskPrice: numeric("task_price", {
    precision: 10,
    scale: 2,
  }),

  // per-hour pricing (USDC)
  hourlyRate: numeric("hourly_rate", {
    precision: 10,
    scale: 2,
  }),

  // future-proofing (important for marketplace)
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
});

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
      .notNull()
      .default("active"),
    // active | paused | archived

    budget: numeric("budget", {
      precision: 10,
      scale: 2,
    }).default("0"),

    completedTasks: text("completed_tasks")
      .notNull()
      .default("0"),

    totalSpent: numeric("total_spent", {
      precision: 10,
      scale: 2,
    }).default("0"),

    createdAt: timestamp("created_at")
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("user_agent_user_idx").on(table.userId),
    agentIdx: index("user_agent_agent_idx").on(table.agentId),
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

    title: text("title").notNull(),

    prompt: text("prompt").notNull(),

    priority: text("priority")
      .notNull()
      .default("normal"),

    status: text("status")
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

  taskId: uuid("task_id"),

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