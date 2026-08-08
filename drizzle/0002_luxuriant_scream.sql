ALTER TABLE "tasks" DROP CONSTRAINT "tasks_agent_id_agents_id_fk";
--> statement-breakpoint
DROP INDEX "task_agent_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_agent_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "prompt" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_agent_id_user_agents_id_fk" FOREIGN KEY ("user_agent_id") REFERENCES "public"."user_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_worker_idx" ON "tasks" USING btree ("user_agent_id");--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "agent_id";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "input";