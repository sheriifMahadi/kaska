export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateServerlessConfig, validateWebConfig } =
    await import("@/platform/config/server");
  if (process.env.VERCEL) {
    validateServerlessConfig();
  } else {
    validateWebConfig();
  }
}
