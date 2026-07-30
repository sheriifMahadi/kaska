import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { serverConfig } from "@/platform/config/server";

const client = postgres(serverConfig.databaseUrl, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
  prepare: false,
});

export const db = drizzle(client);

export function closeDatabase() {
  return client.end();
}
