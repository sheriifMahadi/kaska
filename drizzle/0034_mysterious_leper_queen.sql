CREATE TABLE "worker_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"correlation_id" text NOT NULL,
	"reconciliation" boolean DEFAULT false NOT NULL,
	"not_before" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"processing_owner" text,
	"processing_lease_expires_at" timestamp,
	"last_error" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "worker_outbox_deduplication_key_unique" UNIQUE("deduplication_key"),
	CONSTRAINT "worker_outbox_role_check" CHECK ("worker_outbox"."role" in ('tasks', 'payments', 'wallets', 'schedules')),
	CONSTRAINT "worker_outbox_status_check" CHECK ("worker_outbox"."status" in ('pending', 'processing', 'published')),
	CONSTRAINT "worker_outbox_attempt_count_check" CHECK ("worker_outbox"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX "worker_outbox_pending_idx" ON "worker_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "worker_outbox_lease_idx" ON "worker_outbox" USING btree ("processing_lease_expires_at");