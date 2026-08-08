ALTER TABLE "task_outputs" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "output_tokens" integer;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "latency_ms" integer;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "finish_reason" text;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "format" text DEFAULT 'markdown_v1' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "execution_provider" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "execution_model" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "last_execution_latency_ms" integer;