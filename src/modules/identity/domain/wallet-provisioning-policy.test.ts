import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_WALLET_PROVISIONING_ATTEMPTS,
  nextWalletProvisioningAttempt,
} from "./wallet-provisioning-policy";

test("wallet retry delays increase between attempts", () => {
  const now = new Date("2026-08-03T00:00:00.000Z");

  assert.equal(
    nextWalletProvisioningAttempt(1, now)?.toISOString(),
    "2026-08-03T00:01:00.000Z"
  );
  assert.equal(
    nextWalletProvisioningAttempt(2, now)?.toISOString(),
    "2026-08-03T00:05:00.000Z"
  );
  assert.equal(
    nextWalletProvisioningAttempt(3, now)?.toISOString(),
    "2026-08-03T00:15:00.000Z"
  );
  assert.equal(
    nextWalletProvisioningAttempt(4, now)?.toISOString(),
    "2026-08-03T01:00:00.000Z"
  );
});

test("automatic wallet retries stop at the configured limit", () => {
  assert.equal(MAX_WALLET_PROVISIONING_ATTEMPTS, 5);
  assert.equal(nextWalletProvisioningAttempt(5), null);
});
