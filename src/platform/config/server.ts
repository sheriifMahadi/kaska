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
  get circleApiKey() {
    return required("CIRCLE_API_KEY");
  },
  get circleEntitySecret() {
    return required("CIRCLE_ENTITY_SECRET");
  },
  get clerkWebhookSecret() {
    return required("CLERK_WEBHOOK_SECRET");
  },
  get settlementPrivateKey(): `0x${string}` {
    const value = required("SETTLEMENT_PRIVATE_KEY");
    if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
      throw new Error("SETTLEMENT_PRIVATE_KEY must be a 32-byte hex private key");
    }
    return value as `0x${string}`;
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
  get testTokenClaimsEnabled() {
    return process.env.TEST_TOKEN_CLAIMS_ENABLED?.trim().toLowerCase() === "true";
  },
  get testTokenSourceWalletId() {
    return required("TEST_TOKEN_SOURCE_WALLET_ID");
  },
} as const;
