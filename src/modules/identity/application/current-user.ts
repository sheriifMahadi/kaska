import "server-only";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { db } from "@/lib/db";
import {
  notFound,
  unauthorized,
} from "@/shared/errors/application-error";

export async function requireCurrentUser() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    throw unauthorized();
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.clerkId, clerkId),
        eq(users.status, "active")
      )
    )
    .limit(1);

  if (!user) {
    throw notFound("User not found");
  }

  return user;
}
