CREATE TABLE "recurring_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_agent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instructions" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"interval_minutes" integer NOT NULL,
	"price_per_run" numeric(18, 6) NOT NULL,
	"spending_limit" numeric(18, 6) NOT NULL,
	"spent_amount" numeric(18, 6) DEFAULT '0' NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"timezone" text NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"status_reason" text,
	"paused_at" timestamp,
	"cancelled_at" timestamp,
	"lease_owner" text,
	"lease_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_job_status_check" CHECK ("recurring_jobs"."status" in ('active', 'paused', 'auto_paused', 'cancelled')),
	CONSTRAINT "recurring_job_interval_check" CHECK ("recurring_jobs"."interval_minutes" between 1 and 43200),
	CONSTRAINT "recurring_job_price_check" CHECK ("recurring_jobs"."price_per_run" > 0),
	CONSTRAINT "recurring_job_spending_check" CHECK ("recurring_jobs"."spending_limit" >= "recurring_jobs"."price_per_run" and "recurring_jobs"."spent_amount" >= 0 and "recurring_jobs"."spent_amount" <= "recurring_jobs"."spending_limit"),
	CONSTRAINT "recurring_job_counters_check" CHECK ("recurring_jobs"."run_count" >= 0 and "recurring_jobs"."consecutive_failures" >= 0),
	CONSTRAINT "recurring_job_date_range_check" CHECK ("recurring_jobs"."ends_at" is null or "recurring_jobs"."ends_at" > "recurring_jobs"."starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_agent_id_user_idx" ON "user_agents" USING btree ("id","user_id");--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_jobs" ADD CONSTRAINT "recurring_job_employment_owner_fk" FOREIGN KEY ("user_agent_id","user_id") REFERENCES "public"."user_agents"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_job_owner_idx" ON "recurring_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "recurring_job_due_idx" ON "recurring_jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "recurring_job_lease_idx" ON "recurring_jobs" USING btree ("lease_expires_at");
