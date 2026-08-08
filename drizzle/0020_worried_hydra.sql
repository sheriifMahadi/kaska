ALTER TABLE "tasks" DROP CONSTRAINT "task_status_check";--> statement-breakpoint
UPDATE "tasks"
SET
	"status" = 'manual_review',
	"error_code" = COALESCE("error_code", 'LEGACY_WORKFLOW_STATE'),
	"error" = COALESCE(
		"error",
		'Legacy payment state requires reconciliation before further processing.'
	),
	"updated_at" = now()
WHERE "status" NOT IN (
	'draft',
	'queued',
	'running',
	'completed',
	'failed',
	'cancelled',
	'manual_review'
);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "task_status_check" CHECK ("tasks"."status" in ('draft', 'queued', 'running', 'completed', 'failed', 'cancelled', 'manual_review'));
