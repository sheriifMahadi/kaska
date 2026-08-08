CREATE TABLE "user_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"budget" numeric(10, 2) DEFAULT '0',
	"completed_tasks" text DEFAULT '0' NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_agents" ADD CONSTRAINT "user_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_agent_user_idx" ON "user_agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_agent_agent_idx" ON "user_agents" USING btree ("agent_id");