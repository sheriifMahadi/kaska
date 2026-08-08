CREATE TABLE "recurring_job_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_job_id" uuid NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"status" text NOT NULL,
	"task_id" uuid,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_job_occurrences_task_id_unique" UNIQUE("task_id"),
	CONSTRAINT "recurring_job_occurrence_status_check" CHECK ("recurring_job_occurrences"."status" in ('task_created', 'skipped_overlap')),
	CONSTRAINT "recurring_job_occurrence_task_check" CHECK (("recurring_job_occurrences"."status" = 'task_created' and "recurring_job_occurrences"."task_id" is not null) or ("recurring_job_occurrences"."status" = 'skipped_overlap' and "recurring_job_occurrences"."task_id" is null))
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "recurring_job_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_for" timestamp;--> statement-breakpoint
ALTER TABLE "recurring_job_occurrences" ADD CONSTRAINT "recurring_job_occurrences_recurring_job_id_recurring_jobs_id_fk" FOREIGN KEY ("recurring_job_id") REFERENCES "public"."recurring_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_job_occurrences" ADD CONSTRAINT "recurring_job_occurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_job_occurrence_idx" ON "recurring_job_occurrences" USING btree ("recurring_job_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "recurring_job_occurrence_time_idx" ON "recurring_job_occurrences" USING btree ("recurring_job_id","scheduled_for");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_job_id_recurring_jobs_id_fk" FOREIGN KEY ("recurring_job_id") REFERENCES "public"."recurring_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_recurring_job_idx" ON "tasks" USING btree ("recurring_job_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_recurring_occurrence_idx" ON "tasks" USING btree ("recurring_job_id","scheduled_for");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "task_recurring_fields_check" CHECK (("tasks"."recurring_job_id" is null and "tasks"."scheduled_for" is null) or ("tasks"."recurring_job_id" is not null and "tasks"."scheduled_for" is not null));
