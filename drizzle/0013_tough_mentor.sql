ALTER TABLE "user_agents" DROP CONSTRAINT "user_agent_limits_check";--> statement-breakpoint
ALTER TABLE "user_agents" DROP CONSTRAINT "user_agent_status_check";--> statement-breakpoint
UPDATE "user_agents" SET "status" = 'active', "paused_at" = NULL WHERE "status" = 'paused';--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "per_run_limit";--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "daily_limit";--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "monthly_limit";--> statement-breakpoint
ALTER TABLE "user_agents" DROP COLUMN "paused_at";--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agent_status_check" CHECK ("user_agents"."status" in ('active', 'archived'));
