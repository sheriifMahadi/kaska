import { NextResponse } from "next/server";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";
import { getDashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";
import {
  wakeDeduplicationId,
  wakeWorkerSafely,
} from "@/core/serverless/qstash";

const WALLET_RECONCILIATION_BUCKET_MS = 5 * 60_000;

export async function GET() {
  try {
    const { user, wallet } = await requireCurrentWallet();
    await wakeWorkerSafely("wallets", {
      reconciliation: true,
      deduplicationId: wakeDeduplicationId(
        "wallets",
        `active-reconciliation-${Math.floor(
          Date.now() / WALLET_RECONCILIATION_BUCKET_MS
        )}`
      ),
    });
    return NextResponse.json(
      await getDashboardProjection(user, wallet),
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return errorResponse(error, "GET /api/dashboard");
  }
}
