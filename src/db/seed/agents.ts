import "dotenv/config";

import { agents } from "@/db/schema";
import { closeDatabase, db } from "@/lib/db";

const catalog = [
  {
    name: "Research Agent",
    slug: "research-agent",
    description: "Finds and summarizes information",
    capabilities: ["research", "summarization"],
    executionProvider: "openrouter" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.50",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
  {
    name: "Content Agent",
    slug: "content-agent",
    description: "Writes blog posts and articles",
    capabilities: ["content", "copywriting"],
    executionProvider: "openrouter" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.75",
    supportsOneTime: true,
    supportsRecurring: false,
    isActive: true,
  },
  {
    name: "SEO Agent",
    slug: "seo-agent",
    description: "Optimizes content for search engines",
    capabilities: ["seo", "content-optimization"],
    executionProvider: "openrouter" as const,
    pricingType: "fixed_per_run" as const,
    price: "2.00",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
];

async function seed() {
  for (const definition of catalog) {
    await db
      .insert(agents)
      .values(definition)
      .onConflictDoUpdate({
        target: agents.slug,
        set: {
          name: definition.name,
          description: definition.description,
          capabilities: definition.capabilities,
          executionProvider: definition.executionProvider,
          pricingType: definition.pricingType,
          price: definition.price,
          supportsOneTime: definition.supportsOneTime,
          supportsRecurring: definition.supportsRecurring,
          isActive: definition.isActive,
          updatedAt: new Date(),
        },
      });
  }
}

seed()
  .catch((error) => {
    console.error("Agent seed failed", error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
