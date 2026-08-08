import assert from "node:assert/strict";
import test from "node:test";

import { canUseWebSearch } from "./tool-policy";

test("web search is limited to explicitly capable OpenAI agents", () => {
  assert.equal(canUseWebSearch("openai", ["web-search"]), true);
  assert.equal(canUseWebSearch("openai", ["summarization"]), false);
  assert.equal(canUseWebSearch("openrouter", ["web-search"]), false);
  assert.equal(canUseWebSearch("heurist", ["web-search"]), false);
});
