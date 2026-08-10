import assert from "node:assert/strict";
import test from "node:test";

import { normalizeProviderError } from "./provider-error";

test("rate limits and provider outages are safe and retryable", () => {
  const rateLimit = normalizeProviderError({ status: 429 }, "openrouter", 50);
  assert.equal(rateLimit.retryable, true);
  assert.equal(rateLimit.code, "PROVIDER_HTTP_429");
  assert.equal(rateLimit.message, "The AI provider is temporarily rate limited.");

  const outage = normalizeProviderError({ status: 503 }, "openai", 75);
  assert.equal(outage.retryable, true);
  assert.equal(outage.code, "PROVIDER_HTTP_503");
});

test("credential and invalid request errors are not retried", () => {
  const credentials = normalizeProviderError({ status: 401 }, "heurist", 10);
  assert.equal(credentials.retryable, false);
  assert.match(credentials.message, /credentials/);

  const invalid = normalizeProviderError({ status: 400 }, "openrouter", 10);
  assert.equal(invalid.retryable, false);
});

test("exhausted provider credit is actionable and not retried", () => {
  const error = normalizeProviderError(
    Object.assign(new Error("Payment required"), { status: 402 }),
    "openrouter",
    25,
    "test/model"
  );
  assert.equal(error.retryable, false);
  assert.equal(
    error.message,
    "The AI provider spending limit or available credit has been reached."
  );
  assert.equal(error.code, "PROVIDER_HTTP_402");
});
