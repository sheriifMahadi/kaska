import { NextRequest, NextResponse } from "next/server";
import { isAddress, type Address } from "viem";

import { walletTransactions } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import { requireActiveCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { parsePositiveUsdc } from
  "@/modules/payments/domain/usdc";
import {
  ARC_TESTNET_USDC,
} from "@/platform/blockchain/arc";
import { invalidInput } from
  "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      typeof body.recipient !== "string" ||
      !isAddress(body.recipient)
    ) {
      throw invalidInput("A valid recipient address is required");
    }

    if (typeof body.amount !== "string") {
      throw invalidInput("A valid USDC amount is required");
    }

    let amount;

    try {
      amount = parsePositiveUsdc(body.amount);
    } catch {
      throw invalidInput("A valid positive USDC amount is required");
    }

    const { user, wallet } = await requireActiveCurrentWallet();
    const recipient = body.recipient as Address;
    const response = await circle.createTransaction({
      walletId: wallet.circleWalletId,
      tokenAddress: ARC_TESTNET_USDC,
      destinationAddress: recipient,
      amount: [amount.decimal],
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM",
        },
      },
    });
    const circleTransactionId = response.data?.id;

    if (!circleTransactionId) {
      throw new Error("Circle returned no transaction ID");
    }

    await db.insert(walletTransactions).values({
      walletId: wallet.id,
      userId: user.id,
      type: "withdrawal",
      direction: "debit",
      status: "pending",
      amount: amount.decimal,
      circleTransactionId,
      source: "circle",
      fromAddress: wallet.address,
      toAddress: recipient,
    });

    return NextResponse.json({
      transactionId: circleTransactionId,
      state: response.data?.state,
    });
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/withdraw");
  }
}
