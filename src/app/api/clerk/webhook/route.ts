import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { serverConfig } from "@/platform/config/server";
import { provisionUserWallet } from
  "@/modules/identity/application/provision-user-wallet";

export async function POST(req: Request) {
  const secret = serverConfig.clerkWebhookSecret;
  const headerPayload = await headers();

  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(secret);

  let event: WebhookEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // =========================
  // USER CREATED
  // =========================
  if (event.type === "user.created") {
    const data = event.data;

    const email =
      data.email_addresses?.[0]?.email_address;

    if (!email) {
      return new NextResponse(
        "User has no email address",
        { status: 400 }
      );
    }

    await provisionUserWallet({
      clerkId: data.id,
      email,
      name:
        `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
        null,
      imageUrl: data.image_url ?? null,
    });
  }

  return NextResponse.json({ success: true });
}
