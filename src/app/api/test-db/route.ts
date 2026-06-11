import { db } from "@/lib/db";
import { users } from "@/db/schema";

export async function GET() {
  const all = await db.select().from(users);
  return Response.json(all);
}