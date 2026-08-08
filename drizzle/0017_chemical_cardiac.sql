CREATE TABLE "task_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"worker_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"provider" text,
	"model" text,
	"latency_ms" integer,
	"error_code" text,
	"error_message" text,
	"retryable" boolean,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "task_attempt_status_check" CHECK ("task_attempts"."status" in ('running', 'completed', 'failed', 'abandoned')),
	CONSTRAINT "task_attempt_number_check" CHECK ("task_attempts"."attempt_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "next_attempt_at" timestamp;--> statement-breakpoint
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_attempt_task_idx" ON "task_attempts" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_attempt_unique_idx" ON "task_attempts" USING btree ("task_id","attempt_number");--> statement-breakpoint
CREATE INDEX "task_retry_idx" ON "tasks" USING btree ("status","next_attempt_at");