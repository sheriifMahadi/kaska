import assert from "node:assert/strict";
import test from "node:test";

import {
  followupDeduplicationId,
  qstashConfigured,
  workerParallelism,
  wakeDeduplicationId,
  workerBaseUrl,
} from "./qstash";

test("stateful worker callbacks remain serialized", () => {
  assert.equal(workerParallelism("payments"), 1);
  assert.equal(workerParallelism("tasks"), 1);
  assert.equal(workerParallelism("wallets"), 1);
  assert.equal(workerParallelism("schedules"), 1);
});

test("worker URL prefers the explicit public application URL", () => {
  assert.equal(workerBaseUrl({
    APP_URL: "https://kaska.example/",
    VERCEL_URL: "preview.vercel.app",
  }), "https://kaska.example");
});

test("worker URL supports Vercel-provided deployment hosts", () => {
  assert.equal(
    workerBaseUrl({ VERCEL_URL: "kaska-preview.vercel.app" }),
    "https://kaska-preview.vercel.app"
  );
});

test("QStash requires both a token and a public destination", () => {
  assert.equal(qstashConfigured({ QSTASH_TOKEN: "token" }), false);
  assert.equal(qstashConfigured({
    QSTASH_TOKEN: "token",
    APP_URL: "https://kaska.example",
  }), true);
});

test("message deduplication identifiers are bounded and time-bucketed", () => {
  assert.ok(wakeDeduplicationId("tasks", "x".repeat(200)).length <= 128);
  assert.equal(
    followupDeduplicationId("payments", 10_001),
    followupDeduplicationId("payments", 14_999)
  );
});
