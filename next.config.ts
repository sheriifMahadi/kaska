import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel builds its own serverless output. Standalone remains available for
  // the local/Northflank-compatible Docker image.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
