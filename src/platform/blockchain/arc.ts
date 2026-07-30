import "server-only";

import {
  createPublicClient,
  defineChain,
  http,
} from "viem";
import { serverConfig } from "@/platform/config/server";

export const ARC_TESTNET = "ARC-TESTNET";
export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_USDC =
  serverConfig.usdcContractAddress;
export const ESCROW_ADDRESS =
  serverConfig.escrowContractAddress;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [serverConfig.arcRpcUrl],
    },
  },
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(serverConfig.arcRpcUrl),
});

