ALTER TABLE "wallet_transactions" RENAME COLUMN "reference_id" TO "circle_transaction_id";--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "direction" text;--> statement-breakpoint
UPDATE "wallet_transactions"
SET "direction" = CASE
	WHEN lower("type") = 'deposit' THEN 'credit'
	WHEN lower("type") = 'withdrawal' THEN 'debit'
END;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "direction" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "chain_log_index" integer;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "block_number" bigint;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "from_address" text;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "to_address" text;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
CREATE INDEX "wallet_tx_user_created_idx" ON "wallet_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_tx_status_idx" ON "wallet_transactions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_tx_circle_transaction_idx" ON "wallet_transactions" USING btree ("circle_transaction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_tx_idempotency_idx" ON "wallet_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_tx_chain_event_idx" ON "wallet_transactions" USING btree ("tx_hash","chain_log_index");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_tx_positive_amount_check" CHECK ("wallet_transactions"."amount" > 0);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_tx_direction_check" CHECK (("wallet_transactions"."type" = 'deposit' AND "wallet_transactions"."direction" = 'credit') OR ("wallet_transactions"."type" = 'withdrawal' AND "wallet_transactions"."direction" = 'debit'));
