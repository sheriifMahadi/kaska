import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const dbUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, userId))
    .then((r) => r[0]);

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, dbUser.id))
    .then((r) => r[0]);

  if (!wallet) {
    return NextResponse.json(
      { wallet: "null" ,
      status: "initializing" }
    );
  }

  return NextResponse.json(wallet);
}