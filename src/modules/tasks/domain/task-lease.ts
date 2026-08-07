export const TASK_LEASE_DURATION_MS = 120_000;
export const TASK_HEARTBEAT_INTERVAL_MS = 30_000;

export function taskLeaseExpiresAt(
  now: Date,
  durationMs = TASK_LEASE_DURATION_MS
) {
  return new Date(now.getTime() + durationMs);
}

export function isTaskLeaseExpired(
  leaseExpiresAt: Date | null,
  now: Date
) {
  return leaseExpiresAt !== null && leaseExpiresAt <= now;
}
