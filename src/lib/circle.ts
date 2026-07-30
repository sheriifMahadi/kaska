import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import { serverConfig } from "@/platform/config/server";

export const circle = initiateDeveloperControlledWalletsClient({
  apiKey: serverConfig.circleApiKey,
  entitySecret: serverConfig.circleEntitySecret,
});
