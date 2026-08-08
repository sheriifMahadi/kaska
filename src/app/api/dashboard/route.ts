import { NextResponse } from "next/server";
import { requireCurrentWallet } from
  "@/modules/identity/application/current-wallet";
import { errorResponse } from "@/shared/http/error-response";
import { getDashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";

export async function GET() {
  try {
    const { user, wallet } = await requireCurrentWallet();
    return NextResponse.json(await getDashboardProjection(user, wallet));
  } catch (error) {
    return errorResponse(error, "GET /api/dashboard");
  }
}
