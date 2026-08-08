ALTER TABLE "task_payments" ADD COLUMN "processing_owner" text;--> statement-breakpoint
ALTER TABLE "task_payments" ADD COLUMN "processing_lease_expires_at" timestamp;--> statement-breakpoint
CREATE INDEX "task_payment_processing_lease_idx" ON "task_payments" USING btree ("processing_lease_expires_at");