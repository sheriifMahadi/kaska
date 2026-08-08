ALTER TABLE "wallets" ADD COLUMN "wallet_set_idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "wallet_idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "last_circle_request_id" uuid;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "provisioning_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "next_provisioning_attempt_at" timestamp;--> statement-breakpoint
CREATE INDEX "wallet_provisioning_idx" ON "wallets" USING btree ("status","next_provisioning_attempt_at");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_wallet_set_idempotency_key_unique" UNIQUE("wallet_set_idempotency_key");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_wallet_idempotency_key_unique" UNIQUE("wallet_idempotency_key");