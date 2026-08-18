import { config } from "dotenv";
import { Client } from "@upstash/qstash";
import {
  ensureMaintenanceReconciliation,
  removeLegacyReconciliationSchedules,
} from
  "../src/core/serverless/qstash";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const token = process.env.QSTASH_TOKEN?.trim();
  if (!token) throw new Error("QSTASH_TOKEN is required");

  const client = new Client({ token });
  const queue = client.queue({ queueName: "kaska-tasks" });
  await queue.upsert({ parallelism: 2 });
  const details = await queue.get();
  const maintenance = await ensureMaintenanceReconciliation();
  const legacy = maintenance.configured
    ? await removeLegacyReconciliationSchedules()
    : { configured: false as const };

  console.log(JSON.stringify({
    queue: details.name,
    parallelism: details.parallelism,
    paused: details.paused,
    maintenanceReconciliation: maintenance.configured
      ? maintenance.scheduleId
      : "waiting_for_APP_URL",
    removedLegacySchedules:
      legacy.configured ? legacy.removed : [],
  }, null, 2));
}

main().catch((error) => {
  console.error("Could not configure QStash", error);
  process.exitCode = 1;
});
