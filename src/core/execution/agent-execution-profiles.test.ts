import assert from "node:assert/strict";
import test from "node:test";

import {
  getAgentExecutionProfile,
  hasAgentExecutionProfile,
  listAgentExecutionProfiles,
} from "./agent-execution-profiles";

test("only the four approved agents have execution profiles", () => {
  assert.deepEqual(
    listAgentExecutionProfiles().map((profile) => profile.agentSlug).sort(),
    [
      "content-agent",
      "research-agent",
      "trading-research-agent",
      "web-scraper-agent",
    ]
  );
  assert.equal(hasAgentExecutionProfile("x-content-agent"), false);
  assert.equal(hasAgentExecutionProfile("instagram-content-agent"), false);
});

test("execution profiles keep trusted model and tool settings", () => {
  const profile = getAgentExecutionProfile("web-scraper-agent");
  assert.equal(profile?.provider, "openrouter");
  assert.equal(profile?.model, "google/gemini-2.5-flash-lite");
  assert.deepEqual(profile?.tools, ["web_search"]);
  assert.equal(profile?.maxOutputTokens, 800);
});
