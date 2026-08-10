ALTER TABLE "task_outputs" ADD COLUMN "web_search_requests" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "task_outputs" ADD COLUMN "citations" jsonb DEFAULT '[]'::jsonb NOT NULL;