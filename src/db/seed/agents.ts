import "dotenv/config";

import { agents } from "@/db/schema";
import { closeDatabase, db } from "@/lib/db";

const catalog = [
  {
    name: "Web Monitoring Agent",
    slug: "web-monitoring-agent",
    description: "Searches the live web and reports changes with sources",
    capabilities: ["web-search", "web-monitoring", "data-extraction"],
    executionProvider: "openai" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.25",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
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
  {
    name: "Trading Research Agent",
    slug: "trading-research-agent",
    description:
      "Monitors market information and produces risk-aware trading research without executing trades",
    capabilities: ["web-search", "market-research", "risk-analysis"],
    executionProvider: "openai" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.75",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
  {
    name: "Web Scraper Agent",
    slug: "web-scraper-agent",
    description:
      "Collects structured information from public web pages and returns source-backed summaries",
    capabilities: ["web-search", "data-extraction", "structured-output"],
    executionProvider: "openai" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.35",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
  {
    name: "X Content Agent",
    slug: "x-content-agent",
    description:
      "Creates X content plans, post drafts, threads, and recurring campaign ideas for review",
    capabilities: ["social-strategy", "x-content", "copywriting"],
    executionProvider: "openrouter" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.40",
    supportsOneTime: true,
    supportsRecurring: true,
    isActive: true,
  },
  {
    name: "Instagram Content Agent",
    slug: "instagram-content-agent",
    description:
      "Creates Instagram content calendars, caption drafts, concepts, and hashtag suggestions for review",
    capabilities: ["social-strategy", "instagram-content", "copywriting"],
    executionProvider: "openrouter" as const,
    pricingType: "fixed_per_run" as const,
    price: "0.45",
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
