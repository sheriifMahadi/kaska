import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
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
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw notFound("User not found");
  }

  return user;
}

