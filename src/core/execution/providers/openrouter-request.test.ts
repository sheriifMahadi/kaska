import assert from "node:assert/strict";
import test from "node:test";

import { buildOpenRouterRequest } from "./openrouter-request";

test("OpenRouter receives the trusted model and output limit", () => {
  const request = buildOpenRouterRequest({
    model: "google/gemini-2.5-flash-lite",
    systemPrompt: "Trusted system prompt",
    userPrompt: "User task",
    allowWebSearch: true,
    maxOutputTokens: 800,
    timeoutMs: 90_000,
  });

  assert.deepEqual(request, {
    model: "google/gemini-2.5-flash-lite",
    messages: [
      { role: "system", content: "Trusted system prompt" },
      { role: "user", content: "User task" },
    ],
    max_tokens: 800,
  });
});
