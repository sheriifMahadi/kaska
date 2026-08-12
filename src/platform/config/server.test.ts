import assert from "node:assert/strict";
import test from "node:test";

import {
  validateBackgroundConfig,
  validateServerlessConfig,
  validateWebConfig,
} from "./server";

const shared = {
  DATABASE_URL: "postgres://database",
  ARC_RPC_URL: "https://rpc.testnet.arc.network",
  CIRCLE_API_KEY: "circle-key",
  CIRCLE_ENTITY_SECRET: "entity-secret",
};

test("web validation requires web secrets but not worker secrets", () => {
  assert.doesNotThrow(() => validateWebConfig({
    ...shared,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    CLERK_WEBHOOK_SECRET: "whsec_example",
  }));
});

test("serverless validation includes worker and QStash secrets", () => {
  assert.doesNotThrow(() => validateServerlessConfig({
    ...shared,
    APP_URL: "https://kaska.example",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    CLERK_WEBHOOK_SECRET: "whsec_example",
    OPENROUTER_API_KEY: "openrouter-key",
    SETTLEMENT_PRIVATE_KEY: `0x${"1".repeat(64)}`,
    QSTASH_TOKEN: "qstash-token",
    QSTASH_CURRENT_SIGNING_KEY: "current-key",
    QSTASH_NEXT_SIGNING_KEY: "next-key",
  }));
});

test("serverless validation rejects missing QStash delivery keys", () => {
  assert.throws(() => validateServerlessConfig({
    ...shared,
    VERCEL_URL: "preview.vercel.app",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    CLERK_WEBHOOK_SECRET: "whsec_example",
    OPENROUTER_API_KEY: "openrouter-key",
    SETTLEMENT_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  }), /QSTASH_TOKEN/);
});

test("background validation requires worker secrets but not Clerk", () => {
  assert.doesNotThrow(() => validateBackgroundConfig({
    ...shared,
    OPENROUTER_API_KEY: "openrouter-key",
    SETTLEMENT_PRIVATE_KEY: `0x${"1".repeat(64)}`,
  }));
});

test("enabled test-token claims require a source wallet", () => {
  assert.throws(() => validateWebConfig({
    ...shared,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
    CLERK_WEBHOOK_SECRET: "whsec_example",
    TEST_TOKEN_CLAIMS_ENABLED: "true",
  }), /TEST_TOKEN_SOURCE_WALLET_ID/);
});

test("background validation rejects an invalid settlement key", () => {
  assert.throws(() => validateBackgroundConfig({
    ...shared,
    OPENROUTER_API_KEY: "openrouter-key",
    SETTLEMENT_PRIVATE_KEY: "not-a-private-key",
  }), /32-byte hex private key/);
});
