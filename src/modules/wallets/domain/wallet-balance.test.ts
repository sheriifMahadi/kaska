import assert from "node:assert/strict";
import test from "node:test";

import { calculateWalletBalance } from "./wallet-balance";

test("available balance subtracts committed funds", () => {
  assert.deepEqual(calculateWalletBalance(10_000_000n, 2_500_000n), {
    totalMicroUsdc: 10_000_000n,
    committedMicroUsdc: 2_500_000n,
    availableMicroUsdc: 7_500_000n,
    consistent: true,
  });
});

test("available balance never becomes negative", () => {
  assert.deepEqual(calculateWalletBalance(1_000_000n, 2_000_000n), {
    totalMicroUsdc: 1_000_000n,
    committedMicroUsdc: 2_000_000n,
    availableMicroUsdc: 0n,
    consistent: false,
  });
});

test("negative wallet values are rejected", () => {
  assert.throws(() => calculateWalletBalance(-1n, 0n));
  assert.throws(() => calculateWalletBalance(0n, -1n));
});
