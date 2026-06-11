import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arc } from "./chains";

export const config = getDefaultConfig({
  appName: "Kaska",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [arc],
  ssr: true,
});