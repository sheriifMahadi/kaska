ALTER TABLE "tasks" ADD COLUMN "escrow_task_id" integer;--> statement-breakpoint
ALTER TABLE "wallet_locks" ADD COLUMN "escrow_task_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_locks" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "wallet_locks" ADD CONSTRAINT "wallet_locks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_escrow_task_idx" ON "tasks" USING btree ("escrow_task_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_escrow_task_id_unique" UNIQUE("escrow_task_id");