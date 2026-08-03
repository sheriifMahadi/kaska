import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { errorResponse } from "@/shared/http/error-response";

export async function GET() {
  try {
    await requireCurrentUser();
    const data = await db.select().from(agents);

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error, "GET /api/agents");
  }
}
