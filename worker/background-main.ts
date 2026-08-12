import { createServer } from "node:http";
import { config } from "dotenv";
import { sql } from "drizzle-orm";

config({ path: [".env.local", ".env"], quiet: true });

const portValue = process.env.PORT?.trim() || "8080";
if (!/^\d+$/.test(portValue)) {
  throw new Error("PORT must be a whole number");
}
const port = Number(portValue);
if (port < 1 || port > 65_535) {
  throw new Error("PORT must be between 1 and 65535");
}

const controller = new AbortController();
let readiness: "starting" | "ready" | "stopping" = "starting";

async function main() {
  const { validateBackgroundConfig } =
    await import("../src/platform/config/server");
  validateBackgroundConfig();

  const [{ startWorker }, { closeDatabase, db }] = await Promise.all([
    import("../src/core/execution/worker"),
    import("../src/lib/db"),
  ]);

  const healthServer = createServer(async (request, response) => {
    if (request.url !== "/health" && request.url !== "/ready") {
      response.writeHead(404).end();
      return;
    }

    let databaseReady = false;
    if (readiness === "ready") {
      try {
        await db.execute(sql`select 1`);
        databaseReady = true;
      } catch (error) {
        console.error("Background readiness check failed", error);
      }
    }

    const ready = readiness === "ready" && databaseReady;
    response.writeHead(ready ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    response.end(JSON.stringify({
      service: "kaska-background",
      status: ready ? "ready" : readiness,
    }));
  });

  const worker = startWorker(controller.signal);
  try {
    await new Promise<void>((resolve, reject) => {
      healthServer.once("error", reject);
      healthServer.listen(port, "0.0.0.0", () => {
        healthServer.off("error", reject);
        readiness = "ready";
        console.log(`Background health server listening on ${port}`);
        resolve();
      });
    });
  } catch (error) {
    controller.abort();
    await worker;
    await closeDatabase();
    throw error;
  }

  const shutdown = (signal: string) => {
    if (readiness === "stopping") return;
    readiness = "stopping";
    console.log(`Received ${signal}; stopping background service`);
    controller.abort();
    healthServer.close();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await worker;
  } finally {
    readiness = "stopping";
    await new Promise<void>((resolve) => {
      if (!healthServer.listening) return resolve();
      healthServer.close(() => resolve());
    });
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Background service terminated unexpectedly", error);
  process.exitCode = 1;
});
