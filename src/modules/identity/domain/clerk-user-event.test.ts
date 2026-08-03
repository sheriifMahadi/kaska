import assert from "node:assert/strict";
import test from "node:test";
import type { WebhookEvent } from "@clerk/nextjs/server";

import {
  canApplyClerkUserUpsert,
  clerkUserProfile,
  isCompletedWebhook,
  type ClerkUserUpsertEvent,
} from "./clerk-user-event";

function userEvent(
  type: "user.created" | "user.updated"
): ClerkUserUpsertEvent {
  return {
    type,
    data: {
      id: "clerk-user-1",
      first_name: "Kaska",
      last_name: "Tester",
      image_url: "https://example.com/avatar.png",
      primary_email_address_id: "email-primary",
      email_addresses: [
        {
          id: "email-secondary",
          email_address: "secondary@example.com",
        },
        {
          id: "email-primary",
          email_address: "primary@example.com",
        },
      ],
    },
  } as unknown as Extract<
    WebhookEvent,
    { type: "user.created" | "user.updated" }
  >;
}

test("Clerk user events use the primary email and normalized name", () => {
  assert.deepEqual(clerkUserProfile(userEvent("user.created")), {
    clerkId: "clerk-user-1",
    email: "primary@example.com",
    name: "Kaska Tester",
    imageUrl: "https://example.com/avatar.png",
  });
});

test("Clerk user updates use the same profile mapping", () => {
  assert.equal(
    clerkUserProfile(userEvent("user.updated")).email,
    "primary@example.com"
  );
});

test("only completed webhook receipts are treated as duplicates", () => {
  assert.equal(isCompletedWebhook("completed"), true);
  assert.equal(isCompletedWebhook("failed"), false);
  assert.equal(isCompletedWebhook("processing"), false);
  assert.equal(isCompletedWebhook(undefined), false);
});

test("late Clerk updates cannot reactivate a deleted user", () => {
  assert.equal(canApplyClerkUserUpsert("active"), true);
  assert.equal(canApplyClerkUserUpsert(undefined), true);
  assert.equal(canApplyClerkUserUpsert("deleted"), false);
});
