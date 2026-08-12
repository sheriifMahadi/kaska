import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";

config({ path: [".env.local", ".env"], quiet: true });

const apiKey = process.env.CIRCLE_API_KEY?.trim();
const entitySecret = process.env.CIRCLE_ENTITY_SECRET?.trim();
if (!apiKey || !entitySecret) {
  throw new Error("Circle credentials are required");
}

const circle = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});
const refId = "kaska-test-token-distributor";

async function main() {
  const existing = await circle.listWallets({
    blockchain: "ARC-TESTNET",
    refId,
    pageSize: 10,
  });
  const matches = existing.data?.wallets?.filter(
    (wallet) => wallet.refId === refId &&
      (!wallet.blockchain || wallet.blockchain === "ARC-TESTNET")
  ) ?? [];

  if (matches.length > 1) {
    throw new Error("Multiple distribution wallets already exist");
  }
  if (matches[0]?.id && matches[0].address) {
    printWallet(matches[0]);
    return;
  }

  const walletSet = await circle.createWalletSet({
    name: "kaska-test-token-distributor",
    idempotencyKey: randomUUID(),
  });
  const walletSetId = walletSet.data?.walletSet?.id;
  if (!walletSetId) throw new Error("Circle returned no wallet-set ID");

  const response = await circle.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
    metadata: [{
      name: "Kaska test-token distributor",
      refId,
    }],
    idempotencyKey: randomUUID(),
  });
  const wallet = response.data?.wallets?.[0];
  if (!wallet?.id || !wallet.address) {
    throw new Error("Circle returned an incomplete distribution wallet");
  }
  printWallet(wallet);
}

function printWallet(wallet: {
  id?: string;
  address?: string;
  walletSetId?: string;
}) {
  console.log(JSON.stringify({
    walletId: wallet.id,
    address: wallet.address,
    walletSetId: wallet.walletSetId,
    blockchain: "ARC-TESTNET",
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
