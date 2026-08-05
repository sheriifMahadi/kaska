import { NextResponse } from "next/server";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { listMarketplaceAgents } from
  "@/modules/agents/application/list-marketplace-agents";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const data = await listMarketplaceAgents(user.id);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error, "GET /api/agents");
  }
}
