function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

type RuntimeEnvironment = Readonly<Record<string, string | undefined>>;

const WEB_REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SECRET",
  "CIRCLE_API_KEY",
  "CIRCLE_ENTITY_SECRET",
] as const;

const BACKGROUND_REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "CIRCLE_API_KEY",
  "CIRCLE_ENTITY_SECRET",
  "OPENROUTER_API_KEY",
  "SETTLEMENT_PRIVATE_KEY",
] as const;

const SERVERLESS_REQUIRED_VARIABLES = [
  ...WEB_REQUIRED_VARIABLES,
  "OPENROUTER_API_KEY",
  "SETTLEMENT_PRIVATE_KEY",
  "QSTASH_TOKEN",
  "QSTASH_CURRENT_SIGNING_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
] as const;

function hasValue(environment: RuntimeEnvironment, name: string) {
  return Boolean(environment[name]?.trim());
}

function arcRpcUrl(environment: RuntimeEnvironment) {
  return environment.ARC_RPC_URL?.trim()
    || environment.NEXT_PUBLIC_ARC_RPC_URL?.trim();
}

function validateRole(
  role: "web" | "background" | "serverless",
  requiredVariables: readonly string[],
  environment: RuntimeEnvironment
) {
  const missing = requiredVariables.filter(
    (name) => !hasValue(environment, name)
  );

  if (!arcRpcUrl(environment)) {
    missing.push("ARC_RPC_URL (or NEXT_PUBLIC_ARC_RPC_URL)");
  }
  if (
    environment.TEST_TOKEN_CLAIMS_ENABLED?.trim().toLowerCase() === "true"
    && !hasValue(environment, "TEST_TOKEN_SOURCE_WALLET_ID")
  ) {
    missing.push("TEST_TOKEN_SOURCE_WALLET_ID");
  }

  if (missing.length > 0) {
    throw new Error(
      `Invalid ${role} service configuration. Missing: ${missing.join(", ")}`
    );
  }

  const settlementKey = environment.SETTLEMENT_PRIVATE_KEY?.trim();
  if (
    (role === "background" || role === "serverless")
    && settlementKey
    && !/^0x[0-9a-fA-F]{64}$/.test(settlementKey)
  ) {
    throw new Error(
      "Invalid background service configuration. "
      + "SETTLEMENT_PRIVATE_KEY must be a 32-byte hex private key"
    );
  }
}

export function validateWebConfig(environment: RuntimeEnvironment = process.env) {
  validateRole("web", WEB_REQUIRED_VARIABLES, environment);
}

export function validateBackgroundConfig(
  environment: RuntimeEnvironment = process.env
) {
  validateRole("background", BACKGROUND_REQUIRED_VARIABLES, environment);
}

export function validateServerlessConfig(
  environment: RuntimeEnvironment = process.env
) {
  validateRole("serverless", SERVERLESS_REQUIRED_VARIABLES, environment);
  if (
    !hasValue(environment, "APP_URL")
    && !hasValue(environment, "VERCEL_PROJECT_PRODUCTION_URL")
    && !hasValue(environment, "VERCEL_URL")
  ) {
    throw new Error(
      "Invalid serverless service configuration. Missing: APP_URL "
      + "(or a Vercel-provided deployment URL)"
    );
  }
}

export const serverConfig = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get arcRpcUrl() {
    return process.env.ARC_RPC_URL?.trim()
      || required("NEXT_PUBLIC_ARC_RPC_URL");
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
  get databasePoolMax() {
    const raw = process.env.DATABASE_POOL_MAX?.trim()
      || (process.env.VERCEL ? "1" : "5");
    if (!/^\d+$/.test(raw)) {
      throw new Error("DATABASE_POOL_MAX must be a whole number between 1 and 20");
    }
    const value = Number(raw);
    if (value < 1 || value > 20) {
      throw new Error("DATABASE_POOL_MAX must be a whole number between 1 and 20");
    }
    return value;
  },
} as const;
