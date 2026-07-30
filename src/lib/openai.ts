import OpenAI from "openai";
import { serverConfig } from "@/platform/config/server";

export const openai = new OpenAI({
  apiKey: serverConfig.openAiApiKey,
});
