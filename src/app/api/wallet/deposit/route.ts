import { NextResponse } from "next/server";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { errorResponse } from "@/shared/http/error-response";

export async function POST() {
  try {
    await requireCurrentUser();

    return NextResponse.json({
      message: "Deposit endpoint coming soon",
    });
  } catch (error) {
    return errorResponse(error, "POST /api/wallet/deposit");
  }
}
