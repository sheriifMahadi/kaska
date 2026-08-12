import { NextRequest, NextResponse } from "next/server";
import { requireActiveCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { createWithdrawal } from
  "@/modules/wallets/application/create-withdrawal";
import { parseWithdrawalRequest } from
  "@/modules/wallets/domain/withdrawal";
import { invalidInput } from
  "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";
import {
  wakeDeduplicationId,
  wakeWorkerSafely,
} from "@/core/serverless/qstash";

export async function POST(request: NextRequest) {
  try {
    let withdrawal;
    try {
      withdrawal = parseWithdrawalRequest(await request.json());
    } catch (error) {
      throw invalidInput(
        error instanceof Error ? error.message : "Invalid withdrawal"
      );
    }

    const { user, wallet } = await requireActiveCurrentWallet();
    const result = await createWithdrawal({
      userId: user.id,
      walletId: wallet.id,
      circleWalletId: wallet.circleWalletId,
      walletAddress: wallet.address,
    }, withdrawal);
    await wakeWorkerSafely("wallets", {
      delaySeconds: 5,
      deduplicationId: wakeDeduplicationId(
        "wallets",
        `withdrawal-${result.transactionId}`
      ),
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/withdraw");
  }
}
