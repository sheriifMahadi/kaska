import { NextResponse } from "next/server";

import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import {
  claimTestToken,
  getTestTokenGrant,
} from "@/modules/wallets/application/test-token-grants";
import { serverConfig } from "@/platform/config/server";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { user, wallet } = await requireCurrentWallet();
    const grant = await getTestTokenGrant(user.id);
    return NextResponse.json({
      enabled: serverConfig.testTokenClaimsEnabled,
      walletReady: wallet.status === "active" && Boolean(wallet.address),
      status: grant?.status ?? "available",
      error: grant?.status === "failed" ? grant.error : null,
      completedAt: grant?.completedAt ?? null,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/test-token");
  }
}

export async function POST() {
  try {
    const { user } = await requireCurrentWallet();
    const grant = await claimTestToken(user.id);
    return NextResponse.json(grant, { status: 202 });
  } catch (error) {
    return errorResponse(error, "POST /api/test-token");
  }
}
