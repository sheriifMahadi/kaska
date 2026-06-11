import { defineChain } from "viem";

export const arc = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID),
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: [process.env
        .NEXT_PUBLIC_ARC_RPC_URL || ""],
    },
  },
});