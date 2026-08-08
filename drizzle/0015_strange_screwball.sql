DROP INDEX "task_output_task_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "lease_owner" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "lease_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "last_heartbeat_at" timestamp;--> statement-breakpoint
CREATE INDEX "task_lease_idx" ON "tasks" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_output_task_idx" ON "task_outputs" USING btree ("task_id");