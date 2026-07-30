import OpenAI from "openai";
import { serverConfig } from "@/platform/config/server";

export const openrouter = new OpenAI({
  apiKey: serverConfig.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});
