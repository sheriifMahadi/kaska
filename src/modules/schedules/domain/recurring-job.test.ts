import assert from "node:assert/strict";
import test from "node:test";

import {
  canTransitionRecurringJob,
  parseRecurringJobInput,
  recurringJobCanRun,
  recurringBudgetAllowsRun,
  shouldAutoPauseAfterRefund,
  validateRecurringJobPrice,
} from "./recurring-job";
import {
  advanceSchedule,
  calculateFirstRun,
  formatScheduleTime,
  recurringJobIsDue,
  SCHEDULE_LEASE_MS,
  scheduleLeaseExpiresAt,
  scheduleLeaseIsAvailable,
  scheduledRunIsStale,
} from "./schedule";

const employmentId = "01936f2e-7f70-7b62-8f1a-7fab5fda7465";

test("normalizes a user-selected recurring interval and total limit", () => {
  const input = parseRecurringJobInput({
    userAgentId: employmentId,
    name: " Hourly prices ",
    instructions: " Scrape the current product prices. ",
    intervalMinutes: 60,
    spendingLimit: "6.000000",
    timezone: "Africa/Lagos",
    startsAt: "2026-08-09T08:00:00.000Z",
  });
  assert.equal(input.name, "Hourly prices");
  assert.equal(input.instructions, "Scrape the current product prices.");
  assert.equal(input.intervalMinutes, 60);
  assert.equal(input.spendingLimit, "6");
  assert.equal(input.timezone, "Africa/Lagos");
});

test("rejects invalid intervals, timezones, and date ranges", () => {
  const base = {
    userAgentId: employmentId,
    name: "Hourly prices",
    instructions: "Scrape the current product prices.",
    spendingLimit: "6",
    timezone: "Africa/Lagos",
  };
  assert.throws(() => parseRecurringJobInput({ ...base, intervalMinutes: 0 }));
  assert.throws(() => parseRecurringJobInput({
    ...base,
    intervalMinutes: 60,
    timezone: "Mars/Olympus",
  }));
  assert.throws(() => parseRecurringJobInput({
    ...base,
    intervalMinutes: 60,
    startsAt: "2026-08-10T00:00:00Z",
    endsAt: "2026-08-09T00:00:00Z",
  }));
});

test("the total limit must fund at least one run", () => {
  assert.deepEqual(validateRecurringJobPrice("6", "0.25"), {
    spendingLimit: "6",
    pricePerRun: "0.25",
  });
  assert.throws(() => validateRecurringJobPrice("0.10", "0.25"));
});

test("a run must fit completely inside the remaining total limit", () => {
  assert.equal(recurringBudgetAllowsRun("5.5", "6", "0.25"), true);
  assert.equal(recurringBudgetAllowsRun("5.75", "6", "0.25"), true);
  assert.equal(recurringBudgetAllowsRun("5.8", "6", "0.25"), false);
});

test("three consecutive refunds trigger automatic pausing", () => {
  assert.equal(shouldAutoPauseAfterRefund(0), false);
  assert.equal(shouldAutoPauseAfterRefund(1), false);
  assert.equal(shouldAutoPauseAfterRefund(2), true);
});

test("only active recurring jobs can run", () => {
  assert.equal(recurringJobCanRun("active"), true);
  assert.equal(recurringJobCanRun("paused"), false);
  assert.equal(recurringJobCanRun("auto_paused"), false);
  assert.equal(recurringJobCanRun("completed"), false);
  assert.equal(recurringJobCanRun("cancelled"), false);
  assert.equal(canTransitionRecurringJob("active", "paused"), true);
  assert.equal(canTransitionRecurringJob("paused", "active"), true);
  assert.equal(canTransitionRecurringJob("cancelled", "active"), false);
  assert.equal(canTransitionRecurringJob("completed", "active"), false);
});

test("a future start becomes the first run", () => {
  const startsAt = new Date("2026-08-09T09:00:00.000Z");
  assert.deepEqual(calculateFirstRun({
    startsAt,
    endsAt: null,
    intervalMinutes: 60,
    now: new Date("2026-08-09T08:00:00.000Z"),
  }), { nextRunAt: startsAt, missedRuns: 0 });
});

test("missed occurrences are skipped without a catch-up burst", () => {
  assert.deepEqual(advanceSchedule({
    scheduledFor: new Date("2026-08-09T10:00:00.000Z"),
    endsAt: null,
    intervalMinutes: 60,
    now: new Date("2026-08-09T13:30:00.000Z"),
  }), {
    nextRunAt: new Date("2026-08-09T14:00:00.000Z"),
    missedRuns: 3,
  });
});

test("a schedule stops when its next slot exceeds the end time", () => {
  assert.deepEqual(advanceSchedule({
    scheduledFor: new Date("2026-08-09T10:00:00.000Z"),
    endsAt: new Date("2026-08-09T10:30:00.000Z"),
    intervalMinutes: 60,
    now: new Date("2026-08-09T10:05:00.000Z"),
  }), { nextRunAt: null, missedRuns: 0 });
});

test("only active jobs whose slot has arrived are due", () => {
  const nextRunAt = new Date("2026-08-09T10:00:00.000Z");
  const now = new Date("2026-08-09T10:00:00.000Z");
  assert.equal(recurringJobIsDue({ status: "active", nextRunAt, endsAt: null, now }), true);
  assert.equal(recurringJobIsDue({ status: "paused", nextRunAt, endsAt: null, now }), false);
  assert.equal(recurringJobIsDue({ status: "active", nextRunAt: null, endsAt: null, now }), false);
});

test("saved timezones display the same instant in local time", () => {
  const instant = new Date("2026-08-09T12:00:00.000Z");
  assert.match(formatScheduleTime(instant, "Africa/Lagos"), /1:00 PM/);
  assert.match(formatScheduleTime(instant, "America/New_York"), /8:00 AM/);
});

test("scheduler leases expire and become recoverable", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  assert.equal(
    scheduleLeaseExpiresAt(now).getTime(),
    now.getTime() + SCHEDULE_LEASE_MS
  );
  assert.equal(scheduleLeaseIsAvailable(null, now), true);
  assert.equal(
    scheduleLeaseIsAvailable(new Date("2026-08-09T11:59:59.000Z"), now),
    true
  );
  assert.equal(
    scheduleLeaseIsAvailable(new Date("2026-08-09T12:00:01.000Z"), now),
    false
  );
});

test("an occurrence one full interval late is missed, not executed", () => {
  const scheduledFor = new Date("2026-08-09T10:00:00.000Z");
  assert.equal(
    scheduledRunIsStale(
      scheduledFor,
      60,
      new Date("2026-08-09T10:59:59.000Z")
    ),
    false
  );
  assert.equal(
    scheduledRunIsStale(
      scheduledFor,
      60,
      new Date("2026-08-09T11:00:00.000Z")
    ),
    true
  );
});
