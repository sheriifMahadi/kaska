ALTER TABLE "recurring_jobs" DROP CONSTRAINT "recurring_job_status_check";--> statement-breakpoint
ALTER TABLE "recurring_jobs" DROP CONSTRAINT "recurring_job_counters_check";--> statement-breakpoint
ALTER TABLE "recurring_jobs" ALTER COLUMN "next_run_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD COLUMN "missed_run_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_job_status_check" CHECK ("recurring_jobs"."status" in ('active', 'paused', 'auto_paused', 'completed', 'cancelled'));--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_job_counters_check" CHECK ("recurring_jobs"."run_count" >= 0 and "recurring_jobs"."consecutive_failures" >= 0 and "recurring_jobs"."missed_run_count" >= 0);