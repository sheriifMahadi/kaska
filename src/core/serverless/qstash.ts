import { Client } from "@upstash/qstash";

export const workerRoles = [
  "tasks",
  "payments",
  "wallets",
  "schedules",
] as const;
export type WorkerRole = typeof workerRoles[number];

type WakeOptions = {
  delaySeconds?: number;
  notBefore?: Date;
  deduplicationId?: string;
  reconciliation?: boolean;
};

const MAX_FREE_DELAY_SECONDS = 7 * 24 * 60 * 60;
export const SCHEDULE_RECONCILIATION_ID = "kaska-schedule-reconciliation";
export const WALLET_RECONCILIATION_ID = "kaska-wallet-reconciliation";

export function workerBaseUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env
) {
  const configured = environment.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const vercel = environment.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || environment.VERCEL_URL?.trim();
  return vercel ? `https://${vercel.replace(/\/$/, "")}` : null;
}

export function qstashConfigured(
  environment: Readonly<Record<string, string | undefined>> = process.env
) {
  return Boolean(environment.QSTASH_TOKEN?.trim() && workerBaseUrl(environment));
}

export async function wakeWorker(role: WorkerRole, options: WakeOptions = {}) {
  const token = process.env.QSTASH_TOKEN?.trim();
  const baseUrl = workerBaseUrl();
  if (!token || !baseUrl) return { queued: false as const };

  const nowSeconds = Math.floor(Date.now() / 1_000);
  const requestedNotBefore = options.notBefore
    // QStash accepts whole seconds. Round up so a due-time message can never
    // arrive just before the database timestamp it is meant to process.
    ? Math.ceil(options.notBefore.getTime() / 1_000)
    : undefined;
  const notBefore = requestedNotBefore && requestedNotBefore > nowSeconds
    ? requestedNotBefore
    : undefined;
  if (
    notBefore
    && notBefore - nowSeconds > MAX_FREE_DELAY_SECONDS
  ) {
    return { queued: false as const, reason: "beyond_free_delay" as const };
  }

  const client = new Client({ token });
  const request = {
    url: `${baseUrl}/api/internal/workers/${role}`,
    body: { role, reconciliation: options.reconciliation ?? false },
    delay: options.delaySeconds,
    notBefore,
    deduplicationId: options.deduplicationId,
    retries: 3,
    retryDelay: "max(1000, pow(2, retried) * 1000)",
    timeout: role === "schedules" ? 60 : 240,
    label: [`kaska`, role],
  };

  if (role === "tasks") {
    await client.queue({ queueName: "kaska-tasks" }).enqueueJSON(request);
  } else {
    await client.publishJSON({
      ...request,
      flowControl: { key: `kaska-${role}`, parallelism: 1 },
    });
  }

  return { queued: true as const };
}

export async function scheduleRecurringWake(
  jobId: string,
  nextRunAt: Date | null
) {
  if (!nextRunAt) return { queued: false as const };
  return wakeWorkerSafely("schedules", {
    notBefore: nextRunAt,
    deduplicationId: wakeDeduplicationId(
      "schedules",
      `${jobId}-${nextRunAt.toISOString()}`
    ),
  });
}

export async function ensureScheduleReconciliation() {
  const token = process.env.QSTASH_TOKEN?.trim();
  const baseUrl = workerBaseUrl();
  if (!token || !baseUrl) return { configured: false as const };

  const response = await new Client({ token }).schedules.create({
    destination: `${baseUrl}/api/internal/workers/schedules`,
    scheduleId: SCHEDULE_RECONCILIATION_ID,
    cron: "*/15 * * * *",
    body: JSON.stringify({ role: "schedules", reconciliation: true }),
    headers: { "Content-Type": "application/json" },
    retries: 3,
    retryDelay: "max(1000, pow(2, retried) * 1000)",
    timeout: 60,
    flowControl: { key: "kaska-schedules", parallelism: 1 },
    label: ["kaska", "schedules", "reconciliation"],
  });
  return { configured: true as const, scheduleId: response.scheduleId };
}

export async function ensureWalletReconciliation() {
  const token = process.env.QSTASH_TOKEN?.trim();
  const baseUrl = workerBaseUrl();
  if (!token || !baseUrl) return { configured: false as const };

  const response = await new Client({ token }).schedules.create({
    destination: `${baseUrl}/api/internal/workers/wallets`,
    scheduleId: WALLET_RECONCILIATION_ID,
    cron: "*/15 * * * *",
    body: JSON.stringify({ role: "wallets", reconciliation: true }),
    headers: { "Content-Type": "application/json" },
    retries: 3,
    retryDelay: "max(1000, pow(2, retried) * 1000)",
    timeout: 240,
    flowControl: { key: "kaska-wallets", parallelism: 1 },
    label: ["kaska", "wallets", "reconciliation"],
  });
  return { configured: true as const, scheduleId: response.scheduleId };
}

export async function wakeWorkerSafely(
  role: WorkerRole,
  options: WakeOptions = {}
) {
  try {
    return await wakeWorker(role, options);
  } catch (error) {
    console.error(`Could not wake ${role} worker`, error);
    return { queued: false as const };
  }
}

export function wakeDeduplicationId(role: WorkerRole, subject: string) {
  return `kaska-${role}-${subject}`.slice(0, 128);
}

export function followupDeduplicationId(role: WorkerRole, now = Date.now()) {
  return wakeDeduplicationId(role, `followup-${Math.floor(now / 5_000)}`);
}
