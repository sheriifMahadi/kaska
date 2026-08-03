import { NextResponse } from "next/server";

import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { MAX_WALLET_PROVISIONING_ATTEMPTS } from
  "@/modules/identity/domain/wallet-provisioning-policy";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { wallet } = await requireCurrentWallet();
    const automaticRetryScheduled = Boolean(
      wallet.status === "failed" &&
        wallet.nextProvisioningAttemptAt
    );

    return NextResponse.json({
      status: wallet.status,
      address: wallet.address,
      provisioningAttempts: wallet.provisioningAttempts,
      provisionedAt: wallet.provisionedAt,
      nextProvisioningAttemptAt:
        wallet.nextProvisioningAttemptAt,
      automaticRetryScheduled,
      canRetry:
        wallet.status === "failed" &&
        wallet.provisioningAttempts >=
          MAX_WALLET_PROVISIONING_ATTEMPTS &&
        !wallet.nextProvisioningAttemptAt,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/wallet");
  }
}
