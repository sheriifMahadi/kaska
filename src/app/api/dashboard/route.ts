import { NextResponse } from "next/server";
import { getCurrentDashboardProjection } from
  "@/modules/dashboard/application/get-dashboard-projection";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    return NextResponse.json(await getCurrentDashboardProjection());
  } catch (error) {
    return errorResponse(error, "GET /api/dashboard");
  }
}
