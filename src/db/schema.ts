import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
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

    // IMPORTANT: internal FK (NOT clerkId)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    circleWalletId: text("circle_wallet_id").notNull(),
    
    circleWalletSetId: text("circle_wallet_set_id").notNull(),

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

    // internal user reference (NOT clerkId)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    type: text("type").notNull(), // deposit | withdraw | spend | escrow

    amount: text("amount").notNull(),

    currency: text("currency").notNull().default("USDC"),

    referenceId: text("reference_id"), // Circle tx id

    source: text("source").notNull(), // circle | kaska | agent

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    walletIdx: index("wallet_tx_wallet_idx").on(table.walletId),
    userIdx: index("wallet_tx_user_idx").on(table.userId),
  })
);