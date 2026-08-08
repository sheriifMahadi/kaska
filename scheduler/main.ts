import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const controller = new AbortController();

function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping scheduler`);
  controller.abort();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

async function main() {
  const [{ startScheduler }, { closeDatabase }] = await Promise.all([
    import("../src/core/scheduling/scheduler"),
    import("../src/lib/db"),
  ]);
  try {
    await startScheduler(controller.signal);
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Scheduler terminated unexpectedly", error);
  process.exitCode = 1;
});
