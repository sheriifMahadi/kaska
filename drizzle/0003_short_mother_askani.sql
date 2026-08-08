ALTER TABLE "task_outputs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "tokens" numeric;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "cost" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "error" text;