CREATE TABLE "task_payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_payment_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"provider" text NOT NULL,
	"circle_transaction_id" text,
	"tx_hash" text,
	"block_number" bigint,
	"error_code" text,
	"error" text,
	"prepared_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp,
	"confirmed_at" timestamp,
	"failed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_payment_attempts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "task_payment_attempts_circle_transaction_id_unique" UNIQUE("circle_transaction_id"),
	CONSTRAINT "task_payment_attempt_kind_check" CHECK ("task_payment_attempts"."kind" in ('approval', 'escrow', 'charge', 'refund')),
	CONSTRAINT "task_payment_attempt_status_check" CHECK ("task_payment_attempts"."status" in ('prepared', 'submitted', 'pending', 'confirmed', 'failed', 'reconciled')),
	CONSTRAINT "task_payment_attempt_provider_check" CHECK ("task_payment_attempts"."provider" in ('circle', 'operator')),
	CONSTRAINT "task_payment_attempt_number_check" CHECK ("task_payment_attempts"."attempt_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "task_payment_attempts" ADD CONSTRAINT "task_payment_attempts_task_payment_id_task_payments_id_fk" FOREIGN KEY ("task_payment_id") REFERENCES "public"."task_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_payment_attempts" ADD CONSTRAINT "task_payment_attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_payment_attempt_payment_idx" ON "task_payment_attempts" USING btree ("task_payment_id","prepared_at");--> statement-breakpoint
CREATE INDEX "task_payment_attempt_task_idx" ON "task_payment_attempts" USING btree ("task_id","prepared_at");--> statement-breakpoint
CREATE INDEX "task_payment_attempt_status_idx" ON "task_payment_attempts" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_payment_attempt_kind_number_idx" ON "task_payment_attempts" USING btree ("task_payment_id","kind","attempt_number");
--> statement-breakpoint
INSERT INTO "task_payment_attempts" (
	"task_payment_id", "task_id", "kind", "status", "idempotency_key",
	"provider", "circle_transaction_id", "tx_hash", "error_code", "error",
	"prepared_at", "submitted_at", "confirmed_at", "failed_at", "updated_at"
)
SELECT
	"id", "task_id", 'approval',
	CASE
		WHEN "error_code" = 'APPROVAL_FAILED' THEN 'failed'
		WHEN "status" = 'approval_pending' AND "approval_circle_transaction_id" IS NULL THEN 'prepared'
		WHEN "status" = 'approval_pending' THEN 'pending'
		WHEN "approval_circle_transaction_id" IS NULL THEN 'reconciled'
		ELSE 'confirmed'
	END,
	"approval_idempotency_key", 'circle', "approval_circle_transaction_id",
	"approval_tx_hash",
	CASE WHEN "error_code" = 'APPROVAL_FAILED' THEN "error_code" END,
	CASE WHEN "error_code" = 'APPROVAL_FAILED' THEN "error" END,
	"created_at",
	CASE WHEN "approval_circle_transaction_id" IS NOT NULL THEN "created_at" END,
	CASE
		WHEN "status" <> 'approval_pending' AND "error_code" IS DISTINCT FROM 'APPROVAL_FAILED'
		THEN COALESCE("locked_at", "updated_at")
	END,
	CASE WHEN "error_code" = 'APPROVAL_FAILED' THEN "updated_at" END,
	"updated_at"
FROM "task_payments";
--> statement-breakpoint
INSERT INTO "task_payment_attempts" (
	"task_payment_id", "task_id", "kind", "status", "idempotency_key",
	"provider", "circle_transaction_id", "tx_hash", "error_code", "error",
	"prepared_at", "submitted_at", "confirmed_at", "failed_at", "updated_at"
)
SELECT
	"id", "task_id", 'escrow',
	CASE
		WHEN "error_code" = 'ESCROW_FAILED' THEN 'failed'
		WHEN "status" IN ('approval_pending') THEN 'prepared'
		WHEN "status" = 'escrow_pending' AND "escrow_circle_transaction_id" IS NULL THEN 'prepared'
		WHEN "status" = 'escrow_pending' THEN 'pending'
		WHEN "escrow_circle_transaction_id" IS NOT NULL THEN 'confirmed'
		ELSE 'prepared'
	END,
	"escrow_idempotency_key", 'circle', "escrow_circle_transaction_id",
	"escrow_tx_hash",
	CASE WHEN "error_code" = 'ESCROW_FAILED' THEN "error_code" END,
	CASE WHEN "error_code" = 'ESCROW_FAILED' THEN "error" END,
	"created_at",
	CASE WHEN "escrow_circle_transaction_id" IS NOT NULL THEN "created_at" END,
	CASE WHEN "locked_at" IS NOT NULL THEN "locked_at" END,
	CASE WHEN "error_code" = 'ESCROW_FAILED' THEN "updated_at" END,
	"updated_at"
FROM "task_payments";
--> statement-breakpoint
INSERT INTO "task_payment_attempts" (
	"task_payment_id", "task_id", "kind", "status", "idempotency_key",
	"provider", "tx_hash", "error_code", "error", "prepared_at",
	"submitted_at", "confirmed_at", "failed_at", "updated_at"
)
SELECT
	"id", "task_id", "settlement_kind",
	CASE
		WHEN "status" IN ('charged', 'refunded') THEN 'confirmed'
		WHEN "status" IN ('charge_pending', 'refund_pending') AND "settlement_tx_hash" IS NOT NULL THEN 'pending'
		WHEN "status" IN ('charge_pending', 'refund_pending') THEN 'prepared'
		ELSE 'failed'
	END,
	"settlement_idempotency_key", 'operator', "settlement_tx_hash",
	CASE WHEN "status" IN ('failed', 'manual_review') THEN "error_code" END,
	CASE WHEN "status" IN ('failed', 'manual_review') THEN "error" END,
	COALESCE("locked_at", "created_at"),
	CASE WHEN "settlement_tx_hash" IS NOT NULL THEN COALESCE("locked_at", "created_at") END,
	CASE WHEN "settled_at" IS NOT NULL THEN "settled_at" END,
	CASE WHEN "status" IN ('failed', 'manual_review') THEN "updated_at" END,
	"updated_at"
FROM "task_payments"
WHERE "settlement_kind" IS NOT NULL;
