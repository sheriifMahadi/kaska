import { db } from "@/lib/db";
import { agents } from "@/db/schema";
import "dotenv/config";

async function seed() {
  await db.insert(agents).values([
    {
      name: "Research Agent",
      description: "Finds and summarizes information",
      type: "research",
      pricingModel: "task",
      taskPrice: "0.50",
      isActive: true,
    },
    {
      name: "Content Agent",
      description: "Writes blog posts and articles",
      type: "content",
      pricingModel: "task",
      taskPrice: "0.75",
      isActive: true,
    },
    {
      name: "SEO Agent",
      description: "Optimizes content for search engines",
      type: "seo",
      pricingModel: "hour",
      hourlyRate: "2.00",
      isActive: true,
    },
  ]);
}

seed();