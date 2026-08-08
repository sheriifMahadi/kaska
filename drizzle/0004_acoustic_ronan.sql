CREATE TABLE "wallet_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"task_id" uuid,
	"amount" numeric(18, 6) NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"released_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "wallet_locks" ADD CONSTRAINT "wallet_locks_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;