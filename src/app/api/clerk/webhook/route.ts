import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { serverConfig } from "@/platform/config/server";
import {
  processClerkWebhook,
  recordClerkWebhookFailure,
} from "@/modules/identity/application/process-clerk-webhook";
import {
  wakeDeduplicationId,
  wakeWorkerSafely,
} from "@/core/serverless/qstash";

export async function POST(req: Request) {
  const secret = serverConfig.clerkWebhookSecret;
  const headerPayload = await headers();

  const eventId = headerPayload.get("svix-id");
  const timestamp = headerPayload.get("svix-timestamp");
  const signature = headerPayload.get("svix-signature");

  if (!eventId || !timestamp || !signature) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(secret);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": eventId,
      "svix-timestamp": timestamp,
      "svix-signature": signature,
    }) as WebhookEvent;
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    const result = await processClerkWebhook(eventId, event);
    if (
      !result.duplicate
      && (event.type === "user.created" || event.type === "user.updated")
    ) {
      await wakeWorkerSafely("wallets", {
        deduplicationId: wakeDeduplicationId("wallets", eventId),
      });
    }

    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      handled: result.handled,
    });
  } catch (error) {
    try {
      await recordClerkWebhookFailure(eventId, event, error);
    } catch (recordingError) {
      console.error(
        "Failed to record Clerk webhook failure",
        recordingError
      );
    }

    console.error("Failed to process Clerk webhook", error);

    return NextResponse.json(
      {
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
