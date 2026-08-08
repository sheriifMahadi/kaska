ALTER TABLE "agents" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "capabilities" jsonb;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "execution_provider" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "pricing_type" text;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "price" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "supports_one_time" boolean;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "supports_recurring" boolean;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint

UPDATE "agents"
SET
  "slug" = trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')),
  "description" = coalesce("description", "name"),
  "capabilities" = jsonb_build_array("type"),
  "execution_provider" = 'openrouter',
  "pricing_type" = 'fixed_per_run',
  "price" = coalesce("task_price", "hourly_rate", 0),
  "supports_one_time" = true,
  "supports_recurring" = ("pricing_model" = 'hour'),
  "is_active" = coalesce("is_active", false),
  "created_at" = coalesce("created_at", now()),
  "updated_at" = now();--> statement-breakpoint

WITH ranked AS (
  SELECT "id", "slug", row_number() OVER (PARTITION BY "slug" ORDER BY "created_at", "id") AS duplicate_number
  FROM "agents"
)
UPDATE "agents"
SET "slug" = ranked."slug" || '-' || ranked."duplicate_number"
FROM ranked
WHERE "agents"."id" = ranked."id" AND ranked."duplicate_number" > 1;--> statement-breakpoint

UPDATE "agents" SET "is_active" = false WHERE "price" <= 0;--> statement-breakpoint

ALTER TABLE "agents" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "capabilities" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "capabilities" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "execution_provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "pricing_type" SET DEFAULT 'fixed_per_run';--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "pricing_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "supports_one_time" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "supports_one_time" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "supports_recurring" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "supports_recurring" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agents" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "user_agents" ALTER COLUMN "total_spent" SET DATA TYPE numeric(18, 6);--> statement-breakpoint
UPDATE "user_agents" SET "total_spent" = 0 WHERE "total_spent" IS NULL;--> statement-breakpoint
ALTER TABLE "user_agents" ALTER COLUMN "total_spent" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "user_agents" ALTER COLUMN "total_spent" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "per_run_limit" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "daily_limit" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "monthly_limit" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_agents" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
UPDATE "user_agents" SET "monthly_limit" = nullif("budget", 0);--> statement-breakpoint

CREATE UNIQUE INDEX "agent_slug_idx" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agent_active_idx" ON "agents" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "user_agent_unique_idx" ON "user_agents" USING btree ("user_id","agent_id");--> statement-breakpoint
CREATE INDEX "user_agent_status_idx" ON "user_agents" USING btree ("user_id","status");--> statement-breakpoint

ALTER TABLE "agents" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "pricing_model";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "task_price";--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "hourly_rate";--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "budget";--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "completed_tasks";--> statement-breakpoint

ALTER TABLE "agents" ADD CONSTRAINT "agent_active_price_check" CHECK (not "agents"."is_active" or "agents"."price" > 0);--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agent_schedule_support_check" CHECK ("agents"."supports_one_time" or "agents"."supports_recurring");--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agent_status_check" CHECK ("user_agents"."status" in ('active', 'paused', 'archived'));--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agent_limits_check" CHECK (("user_agents"."per_run_limit" is null or "user_agents"."per_run_limit" >= 0)
  and ("user_agents"."daily_limit" is null or "user_agents"."daily_limit" >= 0)
  and ("user_agents"."monthly_limit" is null or "user_agents"."monthly_limit" >= 0)
  and ("user_agents"."per_run_limit" is null or "user_agents"."daily_limit" is null or "user_agents"."per_run_limit" <= "user_agents"."daily_limit")
  and ("user_agents"."daily_limit" is null or "user_agents"."monthly_limit" is null or "user_agents"."daily_limit" <= "user_agents"."monthly_limit"));
