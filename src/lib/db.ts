import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { serverConfig } from "@/platform/config/server";

const databaseGlobal = globalThis as typeof globalThis & {
  kaskaPostgresClient?: ReturnType<typeof postgres>;
};

const client = databaseGlobal.kaskaPostgresClient ?? postgres(
  serverConfig.databaseUrl,
  {
    ssl: "require",
    max: serverConfig.databasePoolMax,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
    // Required for Supabase's transaction-mode pooler.
    prepare: false,
  }
);

databaseGlobal.kaskaPostgresClient = client;

export const db = drizzle(client);

export function closeDatabase() {
  return client.end();
}
