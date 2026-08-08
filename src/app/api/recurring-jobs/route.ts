import { NextResponse } from "next/server";

import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import {
  createRecurringJob,
  listRecurringJobs,
} from "@/modules/schedules/application/recurring-jobs";
import { invalidInput } from "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(await listRecurringJobs(user.id));
  } catch (error) {
    return errorResponse(error, "GET /api/recurring-jobs");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    try {
      return NextResponse.json(
        await createRecurringJob(user.id, body),
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof Error && error.name === "Error") {
        throw invalidInput(error.message);
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error, "POST /api/recurring-jobs");
  }
}
