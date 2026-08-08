ALTER TABLE "tasks" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "queued_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "task_status_created_idx" ON "tasks" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "task_status_check" CHECK ("tasks"."status" in ('queued', 'running', 'completed', 'failed', 'cancelled', 'draft', 'escrow_pending', 'funds_locked', 'execution_succeeded', 'charge_pending', 'charged', 'escrow_failed', 'execution_failed', 'refund_pending', 'refunded', 'manual_review'));--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "task_attempts_check" CHECK ("tasks"."attempt_count" >= 0 and "tasks"."max_attempts" > 0 and "tasks"."attempt_count" <= "tasks"."max_attempts");