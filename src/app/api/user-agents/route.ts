import { NextResponse } from "next/server";
import { employAgent } from
  "@/modules/agents/application/employ-agent";
import { listEmployedAgents } from
  "@/modules/agents/application/list-employed-agents";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { invalidInput } from
  "@/shared/errors/application-error";
import { errorResponse } from
  "@/shared/http/error-response";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(
      await listEmployedAgents(user.id)
    );
  } catch (error) {
    return errorResponse(error, "GET /api/user-agents");
  }
}

export async function POST(req: Request) {
  try {
    const { agentId } = await req.json();

    if (typeof agentId !== "string" || !agentId.trim()) {
      throw invalidInput("Agent ID is required");
    }

    const user = await requireCurrentUser();
    return NextResponse.json(
      await employAgent(user.id, agentId.trim()),
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error, "POST /api/user-agents");
  }
}
