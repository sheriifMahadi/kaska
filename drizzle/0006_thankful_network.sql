CREATE TABLE "clerk_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clerk_webhook_events_clerk_event_id_unique" UNIQUE("clerk_event_id")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"clerk_id" text,
	"event_type" text NOT NULL,
	"outcome" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "circle_wallet_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "circle_wallet_set_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "provisioning_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "last_provisioning_error" text;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "provisioned_at" timestamp;--> statement-breakpoint
ALTER TABLE "wallets" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "wallets"
SET "provisioned_at" = "created_at"
WHERE "status" = 'active' AND "provisioned_at" IS NULL;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clerk_webhook_status_idx" ON "clerk_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_event_user_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_event_clerk_idx" ON "security_events" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "security_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_circle_wallet_id_unique" UNIQUE("circle_wallet_id");
