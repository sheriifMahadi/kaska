CREATE TEMP TABLE "agent_duplicate_map" ON COMMIT DROP AS
SELECT duplicate."id" AS "duplicate_agent_id", canonical."id" AS "canonical_agent_id"
FROM "agents" duplicate
JOIN "agents" canonical
  ON canonical."slug" = regexp_replace(duplicate."slug", '-[0-9]+$', '')
  AND canonical."name" = duplicate."name"
WHERE duplicate."slug" ~ '-[0-9]+$';--> statement-breakpoint

CREATE TEMP TABLE "employment_duplicate_map" ON COMMIT DROP AS
SELECT duplicate_employment."id" AS "duplicate_employment_id", canonical_employment."id" AS "canonical_employment_id"
FROM "user_agents" duplicate_employment
JOIN "agent_duplicate_map" map
  ON map."duplicate_agent_id" = duplicate_employment."agent_id"
JOIN "user_agents" canonical_employment
  ON canonical_employment."agent_id" = map."canonical_agent_id"
  AND canonical_employment."user_id" = duplicate_employment."user_id";--> statement-breakpoint

UPDATE "tasks" task
SET "user_agent_id" = map."canonical_employment_id"
FROM "employment_duplicate_map" map
WHERE task."user_agent_id" = map."duplicate_employment_id";--> statement-breakpoint

UPDATE "user_agents" canonical
SET
  "total_spent" = canonical."total_spent" + duplicate."total_spent",
  "per_run_limit" = greatest(canonical."per_run_limit", duplicate."per_run_limit"),
  "daily_limit" = greatest(canonical."daily_limit", duplicate."daily_limit"),
  "monthly_limit" = greatest(canonical."monthly_limit", duplicate."monthly_limit"),
  "status" = CASE
    WHEN canonical."status" = 'active' OR duplicate."status" = 'active' THEN 'active'
    WHEN canonical."status" = 'paused' OR duplicate."status" = 'paused' THEN 'paused'
    ELSE 'archived'
  END,
  "updated_at" = now()
FROM "employment_duplicate_map" map
JOIN "user_agents" duplicate ON duplicate."id" = map."duplicate_employment_id"
WHERE canonical."id" = map."canonical_employment_id";--> statement-breakpoint

DELETE FROM "user_agents" employment
USING "employment_duplicate_map" map
WHERE employment."id" = map."duplicate_employment_id";--> statement-breakpoint

UPDATE "user_agents" employment
SET "agent_id" = map."canonical_agent_id", "updated_at" = now()
FROM "agent_duplicate_map" map
WHERE employment."agent_id" = map."duplicate_agent_id";--> statement-breakpoint

DELETE FROM "agents" agent
USING "agent_duplicate_map" map
WHERE agent."id" = map."duplicate_agent_id";
