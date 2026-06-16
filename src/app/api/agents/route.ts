import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/db/schema";

export async function GET() {
  const data = await db.select().from(agents);

  return NextResponse.json(data);
}