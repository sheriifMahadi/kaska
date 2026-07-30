import { config } from "dotenv";

config({
  path: [".env.local", ".env"],
  quiet: true,
});

const controller = new AbortController();

function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping worker`);
  controller.abort();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

async function main() {
  const [{ startWorker }, { closeDatabase }] =
    await Promise.all([
      import("../src/core/execution/worker"),
      import("../src/lib/db"),
    ]);

  try {
    await startWorker(controller.signal);
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Worker terminated unexpectedly", error);
  process.exitCode = 1;
});
