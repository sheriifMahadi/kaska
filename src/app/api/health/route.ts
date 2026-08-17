import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { qstashConfigured } from "@/core/serverless/qstash";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      service: "kaska-web",
      status: "ready",
      workers: {
        qstashConfigured: qstashConfigured(),
      },
    });
  } catch (error) {
    console.error("Web readiness check failed", error);
    return NextResponse.json(
      { service: "kaska-web", status: "unavailable" },
      { status: 503 }
    );
  }
}
