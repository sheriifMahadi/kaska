function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const serverConfig = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get arcRpcUrl() {
    return required("NEXT_PUBLIC_ARC_RPC_URL");
  },
  get usdcContractAddress() {
    return required("USDC_CONTRACT");
  },
  get escrowContractAddress() {
    return required("ESCROW_ADDRESS");
  },
  get circleApiKey() {
    return required("CIRCLE_API_KEY");
  },
  get circleEntitySecret() {
    return required("CIRCLE_ENTITY_SECRET");
  },
  get clerkWebhookSecret() {
    return required("CLERK_WEBHOOK_SECRET");
  },
  get openAiApiKey() {
    return required("OPENAI_API_KEY");
  },
  get openRouterApiKey() {
    return required("OPENROUTER_API_KEY");
  },
  get heuristApiKey() {
    return required("HEURIST_API_KEY");
  },
} as const;
