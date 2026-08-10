import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

type StartService = (signal?: AbortSignal) => Promise<void>;

export async function runWorkerService(
  name: string,
  load: () => Promise<StartService>
) {
  const controller = new AbortController();
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}; stopping ${name} worker`);
    controller.abort();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    const [start, { closeDatabase }] = await Promise.all([
      load(),
      import("../src/lib/db"),
    ]);
    try {
      await start(controller.signal);
    } finally {
      await closeDatabase();
    }
  } catch (error) {
    console.error(`${name} worker terminated unexpectedly`, error);
    process.exitCode = 1;
  }
}
