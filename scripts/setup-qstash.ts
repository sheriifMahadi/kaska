import { config } from "dotenv";
import { Client } from "@upstash/qstash";
import {
  ensureScheduleReconciliation,
  ensureWalletReconciliation,
  ensureWorkflowReconciliation,
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
  const reconciliation = await ensureScheduleReconciliation();
  const walletReconciliation = await ensureWalletReconciliation();
  const workflowReconciliation = await ensureWorkflowReconciliation();

  console.log(JSON.stringify({
    queue: details.name,
    parallelism: details.parallelism,
    paused: details.paused,
    scheduleReconciliation: reconciliation.configured
      ? reconciliation.scheduleId
      : "waiting_for_APP_URL",
    walletReconciliation: walletReconciliation.configured
      ? walletReconciliation.scheduleId
      : "waiting_for_APP_URL",
    workflowReconciliation: workflowReconciliation.configured
      ? workflowReconciliation.scheduleId
      : "waiting_for_APP_URL",
  }, null, 2));
}

main().catch((error) => {
  console.error("Could not configure QStash", error);
  process.exitCode = 1;
});
