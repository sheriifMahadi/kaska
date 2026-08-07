import assert from "node:assert/strict";
import test from "node:test";

import { buildSystemPrompt } from "./build-system-prompt";

test("system prompts include agent identity and a stable output contract", () => {
  const prompt = buildSystemPrompt({
    name: "Researcher",
    description: "Researches markets",
    capabilities: ["research", "analysis"],
  });

  assert.match(prompt, /You are Researcher/);
  assert.match(prompt, /- research/);
  assert.match(prompt, /# Summary/);
  assert.match(prompt, /# Deliverable/);
  assert.match(prompt, /# Sources/);
  assert.match(prompt, /# Limitations/);
});
