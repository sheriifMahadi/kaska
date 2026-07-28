import { createPublicClient, defineChain, http } from "viem";

import { ARC_RPC } from "./arc";

export const arcTestnet = defineChain({
  id: 5042002, 
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC],
    },
  },
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});    