import { processWalletBatch } from "@/core/serverless/process-batches";
import { workerRoute } from "@/core/serverless/worker-route";

export const runtime = "nodejs";
export const maxDuration = 240;
export const POST = workerRoute(
  "wallets",
  ({ reconciliation }) => processWalletBatch(10, undefined, reconciliation),
  (result) => {
    const nextAt = result.nextWalletWorkAt;
    const followups: Array<{
      role: "wallets";
      notBefore: Date;
      reconciliation?: boolean;
    }> = nextAt > 0
      ? [{ role: "wallets" as const, notBefore: new Date(nextAt * 1_000) }]
      : [];
    return followups;
  }
);
