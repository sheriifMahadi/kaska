import type { WebhookEvent } from "@clerk/nextjs/server";

export type ClerkUserUpsertEvent = Extract<
  WebhookEvent,
  { type: "user.created" | "user.updated" }
>;

export function clerkUserProfile(event: ClerkUserUpsertEvent) {
  const data = event.data;
  const email =
    data.email_addresses.find(
      (candidate) => candidate.id === data.primary_email_address_id
    )?.email_address ?? data.email_addresses[0]?.email_address;

  if (!email) {
    throw new Error(`Clerk ${event.type} event has no email address`);
  }

  return {
    clerkId: data.id,
    email,
    name:
      `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
      null,
    imageUrl: data.image_url ?? null,
  };
}

export function isCompletedWebhook(status: string | undefined) {
  return status === "completed";
}

export function canApplyClerkUserUpsert(
  existingStatus: string | undefined
) {
  return existingStatus !== "deleted";
}
