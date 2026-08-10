import assert from "node:assert/strict";
import test from "node:test";

import { canUseWebSearch } from "./tool-policy";

test("web search is limited to approved providers and profiles", () => {
  assert.equal(canUseWebSearch("openai", ["web_search"]), true);
  assert.equal(canUseWebSearch("openrouter", ["web_search"]), true);
  assert.equal(canUseWebSearch("openrouter", []), false);
  assert.equal(canUseWebSearch("heurist", ["web_search"]), false);
});
