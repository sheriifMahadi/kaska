import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, agents, userAgents } from "@/db/schema";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const hiredAgents = await db
      .select({
        userAgentId: userAgents.id,
        createdAt: userAgents.createdAt,
        status: userAgents.status,
        budget: userAgents.budget,
        completedTasks: userAgents.completedTasks,
        totalSpent: userAgents.totalSpent,

        agentId: agents.id,
        name: agents.name,
        description: agents.description,
        type: agents.type,
        pricingModel: agents.pricingModel,
        taskPrice: agents.taskPrice,
        hourlyRate: agents.hourlyRate
      })
      .from(userAgents)
      .innerJoin(
        agents,
        eq(userAgents.agentId, agents.id)
      )
      .where(eq(userAgents.userId, user.id));

    return NextResponse.json(hiredAgents);
  } catch (error) {
    console.error("GET /api/user-agents:", error);

    return NextResponse.json(
      { error: "Failed to fetch hired agents",
        details: error instanceof Error ? error.message : String(error),

      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId));

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }
    const [existing] = await db
  .select()
  .from(userAgents)
  .where(
    and(
      eq(userAgents.userId, user.id),
      eq(userAgents.agentId, agent.id)
    )
  );

if (existing) {
  return NextResponse.json(
    { error: "Agent already hired" },
    { status: 409 }
  );
}
    const [userAgent] = await db
      .insert(userAgents)
      .values({
        userId: user.id,
        agentId: agent.id,
      })
      .returning();

    return NextResponse.json(userAgent, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to hire agent" },
      { status: 500 }
    );
  }
}