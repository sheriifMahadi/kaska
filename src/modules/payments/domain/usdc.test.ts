import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUsdc,
  parseExternalUsdcBalance,
  parsePositiveUsdc,
  parseUsdc,
} from "./usdc";

test("parses USDC without floating point arithmetic", () => {
  assert.deepEqual(parseUsdc("12.345678"), {
    decimal: "12.345678",
    microUsdc: BigInt(12_345_678),
  });
  assert.equal(parseUsdc("1.230000").decimal, "1.23");
});

test("rejects negative and over-precise USDC values", () => {
  assert.throws(() => parseUsdc("-1"));
  assert.throws(() => parseUsdc("0.0000001"));
  assert.throws(() => parseUsdc("1e3"));
});

test("requires positive values for charges", () => {
  assert.throws(() => parsePositiveUsdc("0"));
  assert.equal(
    parsePositiveUsdc("0.000001").microUsdc,
    BigInt(1)
  );
});

test("formats integer micro-USDC values", () => {
  assert.equal(
    formatUsdc(BigInt(1_000_001)),
    "1.000001"
  );
  assert.equal(formatUsdc(BigInt(10_000_000)), "10");
});

test("external balances round down beyond six decimals", () => {
  assert.deepEqual(parseExternalUsdcBalance("12.345678999999"), {
    decimal: "12.345678",
    microUsdc: 12_345_678n,
  });
});
