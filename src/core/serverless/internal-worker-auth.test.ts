import assert from "node:assert/strict";
import test from "node:test";

import { internalWorkerAuthorized } from "./internal-worker-auth";

test("local internal workers accept an exact bearer secret", async () => {
  const request = new Request("http://localhost/internal", {
    headers: { authorization: "Bearer worker-secret" },
  });
  assert.equal(await internalWorkerAuthorized(request, "", {
    NODE_ENV: "development",
    INTERNAL_WORKER_SECRET: "worker-secret",
  }), true);
});

test("production never accepts the local bearer escape hatch", async () => {
  const request = new Request("https://kaska.example/internal", {
    headers: { authorization: "Bearer worker-secret" },
  });
  assert.equal(await internalWorkerAuthorized(request, "", {
    NODE_ENV: "production",
    INTERNAL_WORKER_SECRET: "worker-secret",
  }), false);
});

test("internal workers remain closed without valid authentication", async () => {
  assert.equal(await internalWorkerAuthorized(
    new Request("http://localhost/internal"),
    "",
    { NODE_ENV: "development" }
  ), false);
});
