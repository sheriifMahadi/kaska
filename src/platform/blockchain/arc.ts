import {
  createPublicClient,
  defineChain,
  http,
} from "viem";
import { serverConfig } from "@/platform/config/server";
import { arcTestnetDeployment } from "./deployments";

export const ARC_TESTNET = "ARC-TESTNET";
export const ARC_TESTNET_CHAIN_ID = arcTestnetDeployment.chainId;
export const ARC_TESTNET_USDC = arcTestnetDeployment.usdc;
export const ESCROW_ADDRESS = arcTestnetDeployment.kaskaEscrow;

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
