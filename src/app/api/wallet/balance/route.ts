import { NextResponse } from "next/server";

import { requireActiveCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { getWalletBalance } from
  "@/modules/wallets/application/get-wallet-balance";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const { wallet } = await requireActiveCurrentWallet();
    const balance = await getWalletBalance({
      walletId: wallet.id,
      circleWalletId: wallet.circleWalletId,
      walletAddress: wallet.address,
    });

    return NextResponse.json({
      address: wallet.address,
      ...balance,
    });
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/balance");
  }
}
