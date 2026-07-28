import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 11155111, // replace with the actual Arc Testnet chain ID if different
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [process.env.ARC_RPC!],
    },
  },
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC),
});