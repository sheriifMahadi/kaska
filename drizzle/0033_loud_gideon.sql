CREATE TABLE "test_token_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(18, 6) DEFAULT '1.000000' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"circle_transaction_id" text,
	"tx_hash" text,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"lease_owner" text,
	"lease_expires_at" timestamp,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_token_grants_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "test_token_grants_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "test_token_grants_circle_transaction_id_unique" UNIQUE("circle_transaction_id"),
	CONSTRAINT "test_token_grant_status_check" CHECK ("test_token_grants"."status" in ('pending', 'completed', 'failed')),
	CONSTRAINT "test_token_grant_amount_check" CHECK ("test_token_grants"."amount" = 1)
);
--> statement-breakpoint
ALTER TABLE "test_token_grants" ADD CONSTRAINT "test_token_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_token_grants" ADD CONSTRAINT "test_token_grants_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_token_grant_due_idx" ON "test_token_grants" USING btree ("status","next_attempt_at","lease_expires_at");