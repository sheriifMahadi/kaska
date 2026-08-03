import assert from "node:assert/strict";
import test from "node:test";

import {
  provisionCircleWallet,
  type ProvisioningCircleWallet,
} from "./provision-circle-wallet";

function testInput(circle: FakeCircle) {
  const requestIds: string[] = [];
  let walletSetId: string | null = null;
  let requestNumber = 0;

  return {
    input: {
      userId: "user-1",
      walletSetId: walletSetId as string | null,
      walletSetIdempotencyKey:
        "11111111-1111-4111-8111-111111111111",
      walletIdempotencyKey:
        "22222222-2222-4222-8222-222222222222",
      circle,
      createRequestId: () => `request-${++requestNumber}`,
      recordRequestId: async (requestId: string) => {
        requestIds.push(requestId);
      },
      persistWalletSetId: async (value: string) => {
        walletSetId = value;
      },
    },
    requestIds,
    walletSetId: () => walletSetId,
  };
}

class FakeCircle {
  wallets: ProvisioningCircleWallet[] = [];
  walletSetCreates = 0;
  walletCreates = 0;
  failAfterWalletCreation = false;

  async listWallets(input: { refId: string }) {
    return {
      data: {
        wallets: this.wallets.filter(
          (wallet) => wallet.refId === input.refId
        ),
      },
    };
  }

  async createWalletSet() {
    this.walletSetCreates += 1;
    return { data: { walletSet: { id: "wallet-set-1" } } };
  }

  async createWallets(input: {
    walletSetId: string;
    metadata: [{ refId: string }];
  }) {
    this.walletCreates += 1;
    const wallet = {
      id: "circle-wallet-1",
      walletSetId: input.walletSetId,
      address: "0x1111111111111111111111111111111111111111",
      blockchain: "ARC-TESTNET",
      refId: input.metadata[0].refId,
    };
    this.wallets = [wallet];

    if (this.failAfterWalletCreation) {
      this.failAfterWalletCreation = false;
      throw new Error("Connection lost after Circle created the wallet");
    }

    return { data: { wallets: [wallet] } };
  }
}

test("creates one intended Arc wallet with durable identifiers", async () => {
  const circle = new FakeCircle();
  const context = testInput(circle);

  const result = await provisionCircleWallet(context.input);

  assert.equal(result.reconciled, false);
  assert.equal(result.wallet.refId, "user-1");
  assert.equal(circle.walletSetCreates, 1);
  assert.equal(circle.walletCreates, 1);
  assert.equal(context.walletSetId(), "wallet-set-1");
  assert.deepEqual(context.requestIds, [
    "request-1",
    "request-2",
    "request-3",
  ]);
});

test("reconciles a wallet created before a lost response", async () => {
  const circle = new FakeCircle();
  circle.failAfterWalletCreation = true;
  const firstAttempt = testInput(circle);

  await assert.rejects(
    provisionCircleWallet(firstAttempt.input),
    /Connection lost/
  );
  assert.equal(circle.walletCreates, 1);

  const retry = testInput(circle);
  retry.input.walletSetId = firstAttempt.walletSetId();
  const result = await provisionCircleWallet(retry.input);

  assert.equal(result.reconciled, true);
  assert.equal(result.wallet.id, "circle-wallet-1");
  assert.equal(circle.walletCreates, 1);
  assert.equal(circle.walletSetCreates, 1);
});

test("refuses ambiguous Circle wallet matches", async () => {
  const circle = new FakeCircle();
  circle.wallets = [
    {
      id: "wallet-1",
      walletSetId: "set-1",
      address: "0x1111111111111111111111111111111111111111",
      blockchain: "ARC-TESTNET",
      refId: "user-1",
    },
    {
      id: "wallet-2",
      walletSetId: "set-2",
      address: "0x2222222222222222222222222222222222222222",
      blockchain: "ARC-TESTNET",
      refId: "user-1",
    },
  ];

  await assert.rejects(
    provisionCircleWallet(testInput(circle).input),
    /Multiple Circle wallets/
  );
  assert.equal(circle.walletCreates, 0);
});
