import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { walletTransactions } from "@/db/schema";
import { circle } from "@/lib/circle";
import { db } from "@/lib/db";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { notFound } from "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const [ownedTransaction] = await db
      .select({ referenceId: walletTransactions.referenceId })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.userId, user.id),
          eq(walletTransactions.referenceId, id)
        )
      )
      .limit(1);

    if (!ownedTransaction?.referenceId) {
      throw notFound("Transaction not found");
    }

    const transaction = await circle.getTransaction({ id });

    return NextResponse.json(transaction.data);
  } catch (error) {
    return errorResponse(error, "GET /api/wallet/transaction/[id]");
  }
}
