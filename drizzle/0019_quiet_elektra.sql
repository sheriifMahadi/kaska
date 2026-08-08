ALTER TABLE "wallet_locks" ALTER COLUMN "task_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_locks" ADD CONSTRAINT "wallet_locks_task_id_unique" UNIQUE("task_id");