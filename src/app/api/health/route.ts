import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ service: "kaska-web", status: "ready" });
  } catch (error) {
    console.error("Web readiness check failed", error);
    return NextResponse.json(
      { service: "kaska-web", status: "unavailable" },
      { status: 503 }
    );
  }
}
