import { NextResponse } from "next/server";

import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import {
  getRecurringJob,
  updateRecurringJob,
} from "@/modules/schedules/application/recurring-jobs";
import {
  type RecurringJobStatus,
} from "@/modules/schedules/domain/recurring-job";
import { invalidInput } from "@/shared/errors/application-error";
import { errorResponse } from "@/shared/http/error-response";

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_STATUSES = ["active", "paused", "cancelled"] as const;

export async function GET(_: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    if (!UUID.test(id)) throw invalidInput("Recurring job ID is invalid");
    return NextResponse.json(await getRecurringJob(user.id, id));
  } catch (error) {
    return errorResponse(error, "GET /api/recurring-jobs/[id]");
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const user = await requireCurrentUser();
    const { id } = await params;
    if (!UUID.test(id)) throw invalidInput("Recurring job ID is invalid");
    const body = await request.json() as Record<string, unknown>;
    const status = body.status;
    const spendingLimit = body.spendingLimit;
    if (
      status !== undefined &&
      (typeof status !== "string" ||
        !USER_STATUSES.includes(status as (typeof USER_STATUSES)[number]))
    ) throw invalidInput("Recurring job status is invalid");
    if (spendingLimit !== undefined && typeof spendingLimit !== "string") {
      throw invalidInput("Spending limit is invalid");
    }
    if (status === undefined && spendingLimit === undefined) {
      throw invalidInput("No recurring job change was provided");
    }
    try {
      return NextResponse.json(await updateRecurringJob(user.id, id, {
        status: status as RecurringJobStatus | undefined,
        spendingLimit,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === "Error") {
        throw invalidInput(error.message);
      }
      throw error;
    }
  } catch (error) {
    return errorResponse(error, "PATCH /api/recurring-jobs/[id]");
  }
}
