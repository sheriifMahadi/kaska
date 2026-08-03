import "server-only";

import type { WebhookEvent } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";

import {
  clerkWebhookEvents,
  securityEvents,
  users,
  wallets,
} from "@/db/schema";
import { db } from "@/lib/db";

type SupportedUserEvent = Extract<
  WebhookEvent,
  {
    type: "user.created" | "user.updated" | "user.deleted";
  }
>;

export type ProcessClerkWebhookResult = {
  duplicate: boolean;
  handled: boolean;
};

function userProfile(
  event: Extract<
    SupportedUserEvent,
    { type: "user.created" | "user.updated" }
  >
) {
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

export async function processClerkWebhook(
  eventId: string,
  event: WebhookEvent
): Promise<ProcessClerkWebhookResult> {
  return db.transaction(async (transaction) => {
    // Serializes repeat deliveries of the same Clerk event without
    // holding a lock outside this short database-only transaction.
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${eventId}))`
    );

    const [existingReceipt] = await transaction
      .select({
        status: clerkWebhookEvents.status,
      })
      .from(clerkWebhookEvents)
      .where(eq(clerkWebhookEvents.clerkEventId, eventId))
      .limit(1);

    if (existingReceipt?.status === "completed") {
      return { duplicate: true, handled: true };
    }

    if (existingReceipt) {
      await transaction
        .update(clerkWebhookEvents)
        .set({
          status: "processing",
          attempts: sql`${clerkWebhookEvents.attempts} + 1`,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(clerkWebhookEvents.clerkEventId, eventId));
    } else {
      await transaction.insert(clerkWebhookEvents).values({
        clerkEventId: eventId,
        eventType: event.type,
        status: "processing",
      });
    }

    let handled = true;

    if (event.type === "user.created" || event.type === "user.updated") {
      const profile = userProfile(event);
      const [user] = await transaction
        .insert(users)
        .values({
          ...profile,
          status: "active",
          deletedAt: null,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: profile.email,
            name: profile.name,
            imageUrl: profile.imageUrl,
            status: "active",
            deletedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning();

      await transaction
        .insert(wallets)
        .values({
          userId: user.id,
          status: "pending",
        })
        .onConflictDoNothing({
          target: wallets.userId,
        });

      await transaction.insert(securityEvents).values({
        userId: user.id,
        clerkId: user.clerkId,
        eventType:
          event.type === "user.created"
            ? "identity.user_created"
            : "identity.user_updated",
        outcome: "success",
        metadata: {
          clerkEventId: eventId,
        },
      });
    } else if (event.type === "user.deleted") {
      const clerkId = event.data.id;

      if (!clerkId) {
        throw new Error("Clerk user.deleted event has no user ID");
      }

      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkId))
        .limit(1);

      if (user) {
        await transaction
          .update(users)
          .set({
            status: "deleted",
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }

      await transaction.insert(securityEvents).values({
        userId: user?.id,
        clerkId,
        eventType: "identity.user_deleted",
        outcome: "success",
        metadata: {
          clerkEventId: eventId,
          localUserFound: Boolean(user),
        },
      });
    } else {
      handled = false;
    }

    await transaction
      .update(clerkWebhookEvents)
      .set({
        status: "completed",
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clerkWebhookEvents.clerkEventId, eventId));

    return { duplicate: false, handled };
  });
}

export async function recordClerkWebhookFailure(
  eventId: string,
  event: WebhookEvent,
  error: unknown
) {
  const message =
    error instanceof Error ? error.message : "Unknown webhook error";
  const clerkId =
    "id" in event.data && typeof event.data.id === "string"
      ? event.data.id
      : null;

  await db.transaction(async (transaction) => {
    await transaction
      .insert(clerkWebhookEvents)
      .values({
        clerkEventId: eventId,
        eventType: event.type,
        status: "failed",
        lastError: message.slice(0, 1_000),
      })
      .onConflictDoUpdate({
        target: clerkWebhookEvents.clerkEventId,
        set: {
          status: "failed",
          attempts: sql`${clerkWebhookEvents.attempts} + 1`,
          lastError: message.slice(0, 1_000),
          updatedAt: new Date(),
        },
      });

    await transaction.insert(securityEvents).values({
      clerkId,
      eventType: "identity.webhook_processing_failed",
      outcome: "failure",
      metadata: {
        clerkEventId: eventId,
        clerkEventType: event.type,
      },
    });
  });
}
