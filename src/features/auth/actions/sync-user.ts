import { prisma } from "@/lib/prisma";

type SyncUserParams = {
  clerkId: string;
  email: string;
  name?: string | null;
  imageUrl?: string | null;
};

export async function syncUser({
  clerkId,
  email,
  name,
  imageUrl,
}: SyncUserParams) {
  const existingUser = await prisma.user.findUnique({
    where: {
      clerkId,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      imageUrl,
    },
  });
}