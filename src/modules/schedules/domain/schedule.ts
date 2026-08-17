import {
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  type RecurringJobStatus,
} from "./recurring-job";

type ScheduleResult = {
  nextRunAt: Date | null;
  missedRuns: number;
};

export const SCHEDULE_LEASE_MS = 2 * 60 * 1_000;
export const MIN_SCHEDULE_DELIVERY_WINDOW_MS = 5 * 60 * 1_000;

export function scheduleLeaseExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SCHEDULE_LEASE_MS);
}

export function scheduleLeaseIsAvailable(
  leaseExpiresAt: Date | null,
  now = new Date()
) {
  return leaseExpiresAt === null || leaseExpiresAt <= now;
}

type FirstRunInput = {
  startsAt: Date | null;
  endsAt: Date | null;
  intervalMinutes: number;
  now?: Date;
};

type AdvanceScheduleInput = {
  scheduledFor: Date;
  endsAt: Date | null;
  intervalMinutes: number;
  now?: Date;
};

export function calculateFirstRun({
  startsAt,
  endsAt,
  intervalMinutes,
  now = new Date(),
}: FirstRunInput): ScheduleResult {
  assertScheduleInput(intervalMinutes, now, startsAt, endsAt);
  const anchor = startsAt ?? now;
  if (anchor >= now) {
    return withinEnd(anchor, endsAt, 0);
  }

  const intervalMs = intervalMinutes * 60_000;
  const skipped = Math.floor((now.getTime() - anchor.getTime()) / intervalMs) + 1;
  const candidate = new Date(anchor.getTime() + skipped * intervalMs);
  return withinEnd(candidate, endsAt, skipped);
}

export function advanceSchedule({
  scheduledFor,
  endsAt,
  intervalMinutes,
  now = new Date(),
}: AdvanceScheduleInput): ScheduleResult {
  assertScheduleInput(intervalMinutes, now, scheduledFor, endsAt);
  const intervalMs = intervalMinutes * 60_000;
  let skipped = 0;
  let candidateMs = scheduledFor.getTime() + intervalMs;

  if (candidateMs <= now.getTime()) {
    skipped = Math.floor((now.getTime() - candidateMs) / intervalMs) + 1;
    candidateMs += skipped * intervalMs;
  }

  return withinEnd(new Date(candidateMs), endsAt, skipped);
}

export function recurringJobIsDue({
  status,
  nextRunAt,
  endsAt,
  now = new Date(),
}: {
  status: RecurringJobStatus;
  nextRunAt: Date | null;
  endsAt: Date | null;
  now?: Date;
}) {
  return status === "active" &&
    nextRunAt !== null &&
    nextRunAt <= now &&
    (endsAt === null || nextRunAt <= endsAt);
}

export function scheduledRunIsStale(
  scheduledFor: Date,
  intervalMinutes: number,
  now = new Date()
) {
  // Short test schedules must tolerate normal serverless/QStash delivery
  // latency. Longer schedules retain their full interval as the run window.
  const deliveryWindowMs = Math.max(
    intervalMinutes * 60_000,
    MIN_SCHEDULE_DELIVERY_WINDOW_MS
  );
  return now.getTime() >= scheduledFor.getTime() + deliveryWindowMs;
}

export function formatScheduleTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function withinEnd(
  candidate: Date,
  endsAt: Date | null,
  missedRuns: number
): ScheduleResult {
  return endsAt && candidate > endsAt
    ? { nextRunAt: null, missedRuns }
    : { nextRunAt: candidate, missedRuns };
}

function assertScheduleInput(
  intervalMinutes: number,
  now: Date,
  anchor: Date | null,
  endsAt: Date | null
) {
  if (
    !Number.isInteger(intervalMinutes) ||
    intervalMinutes < MIN_INTERVAL_MINUTES ||
    intervalMinutes > MAX_INTERVAL_MINUTES
  ) throw new Error("Recurring interval is invalid");
  for (const date of [now, anchor, endsAt]) {
    if (date && Number.isNaN(date.getTime())) {
      throw new Error("Schedule date is invalid");
    }
  }
}
