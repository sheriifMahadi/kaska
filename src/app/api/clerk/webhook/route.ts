import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { circle } from "@/lib/circle";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET!;
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

  let event: any;

  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // =========================
  // USER CREATED
  // =========================
  if (event.type === "user.created") {
    const data = event.data;

    const email =
      data.email_addresses?.[0]?.email_address ?? "no-email";

    // 1. CREATE USER
    const inserted = await db
      .insert(users)
      .values({
        clerkId: data.id,
        email,
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        imageUrl: data.image_url,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email,
          name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
          imageUrl: data.image_url,
        },
      })
      .returning();

    const user = inserted[0];

    // =========================
    // CHECK IF WALLET EXISTS
    // =========================
    const existingWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, user.id))
      .then((r) => r[0]);

    if (existingWallet) {
      return NextResponse.json({ success: true, wallet: "exists" });
    }

    // =========================
    // CREATE WALLET SET
    // =========================
    const walletSetResponse = await circle.createWalletSet({
      name: `kaska-${user.id}`,
    });

    const walletSetId =
      walletSetResponse.data?.walletSet?.id;

    if (!walletSetId) {
      return new NextResponse("Wallet set failed", { status: 500 });
    }

    // =========================
    // CREATE WALLET
    // =========================
    const walletResponse = await circle.createWallets({
      walletSetId,
      blockchains: ["ARC-TESTNET"],
      count: 1,
      accountType: "EOA",
    });

    const wallet = walletResponse.data?.wallets?.[0];

    if (!wallet) {
      return new NextResponse("Wallet creation failed", { status: 500 });
    }

    // =========================
    // INSERT WALLET INTO DB
    // =========================
    await db.insert(wallets).values({
      userId: user.id,
      circleWalletId: wallet.id,
      circleWalletSetId: wallet.walletSetId,
      address: wallet.address,
      status: "active",
    });

    console.log("✅ WALLET CREATED FOR USER:", user.id);
  }

  return NextResponse.json({ success: true });
}