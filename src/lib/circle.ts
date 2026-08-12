import {
  initiateDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import { serverConfig } from "@/platform/config/server";

type CircleClient = ReturnType<typeof initiateDeveloperControlledWalletsClient>;

let client: CircleClient | undefined;

function getCircleClient() {
  client ??= initiateDeveloperControlledWalletsClient({
    apiKey: serverConfig.circleApiKey,
    entitySecret: serverConfig.circleEntitySecret,
  });
  return client;
}

/** Defers SDK construction until a request or worker actually uses Circle. */
export const circle = new Proxy({} as CircleClient, {
  get(_target, property) {
    const circleClient = getCircleClient();
    const value = Reflect.get(circleClient, property, circleClient);
    return typeof value === "function" ? value.bind(circleClient) : value;
  },
});
