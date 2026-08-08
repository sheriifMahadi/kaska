ALTER TABLE "task_payments" ADD COLUMN "chain_reconciled_at" timestamp;--> statement-breakpoint
CREATE INDEX "task_payment_chain_reconciled_idx" ON "task_payments" USING btree ("chain_reconciled_at");