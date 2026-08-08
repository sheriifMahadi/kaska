CREATE TABLE "task_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"escrow_id" text NOT NULL,
	"amount" numeric(18, 6) NOT NULL,
	"status" text DEFAULT 'approval_pending' NOT NULL,
	"approval_idempotency_key" uuid NOT NULL,
	"approval_circle_transaction_id" text,
	"approval_tx_hash" text,
	"escrow_idempotency_key" uuid NOT NULL,
	"escrow_circle_transaction_id" text,
	"escrow_tx_hash" text,
	"settlement_kind" text,
	"settlement_idempotency_key" uuid NOT NULL,
	"settlement_tx_hash" text,
	"error_code" text,
	"error" text,
	"locked_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_payments_task_id_unique" UNIQUE("task_id"),
	CONSTRAINT "task_payments_escrow_id_unique" UNIQUE("escrow_id"),
	CONSTRAINT "task_payments_approval_idempotency_key_unique" UNIQUE("approval_idempotency_key"),
	CONSTRAINT "task_payments_approval_circle_transaction_id_unique" UNIQUE("approval_circle_transaction_id"),
	CONSTRAINT "task_payments_escrow_idempotency_key_unique" UNIQUE("escrow_idempotency_key"),
	CONSTRAINT "task_payments_escrow_circle_transaction_id_unique" UNIQUE("escrow_circle_transaction_id"),
	CONSTRAINT "task_payments_settlement_idempotency_key_unique" UNIQUE("settlement_idempotency_key"),
	CONSTRAINT "task_payment_status_check" CHECK ("task_payments"."status" in ('approval_pending', 'escrow_pending', 'locked', 'charge_pending', 'charged', 'refund_pending', 'refunded', 'failed', 'manual_review')),
	CONSTRAINT "task_payment_settlement_kind_check" CHECK ("task_payments"."settlement_kind" is null or "task_payments"."settlement_kind" in ('charge', 'refund')),
	CONSTRAINT "task_payment_positive_amount_check" CHECK ("task_payments"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "escrow_task_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallet_locks" ALTER COLUMN "escrow_task_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "task_payments" ADD CONSTRAINT "task_payments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_payments" ADD CONSTRAINT "task_payments_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_payment_status_idx" ON "task_payments" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "task_payment_wallet_idx" ON "task_payments" USING btree ("wallet_id");