import { NextResponse } from "next/server";

import { changeEmploymentStatus } from
  "@/modules/agents/application/change-employment-status";
import { isEmploymentStatus } from
  "@/modules/agents/domain/agent";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { invalidInput } from
  "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    const body = await request.json();

    if (
      !isEmploymentStatus(body.status)
    ) {
      throw invalidInput("A valid employment status is required");
    }

    return NextResponse.json(
      await changeEmploymentStatus(user.id, id, body.status)
    );
  } catch (error) {
    return errorResponse(error, "PATCH /api/user-agents/[id]");
  }
}
