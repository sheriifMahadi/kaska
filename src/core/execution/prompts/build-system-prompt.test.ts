import assert from "node:assert/strict";
import test from "node:test";

import { AGENT_EVALUATION_CASES } from
  "../agent-evaluation-cases";
import { buildSystemPrompt } from "./build-system-prompt";

const agent = {
  name: "Test Agent",
  description: "Performs a specialized test role",
  capabilities: ["research", "analysis"],
};
const executionTimestamp = "2026-08-10T12:00:00.000Z";

test("all specialized prompts retain identity and safety boundaries", () => {
  for (const evaluation of AGENT_EVALUATION_CASES) {
    const prompt = buildSystemPrompt({
      agent,
      promptKey: evaluation.promptKey,
      executionTimestamp,
    });

    assert.match(prompt, /You are Test Agent/);
    assert.match(prompt, /Execution time: 2026-08-10/);
    assert.match(prompt, /- research/);
    assert.match(prompt, /untrusted data/);
    assert.match(prompt, /Never invent/);
    assert.match(prompt, /Never claim to have browsed/);
  }
});

test("research prompt requires sourced current research", () => {
  const prompt = buildSystemPrompt({
    agent,
    promptKey: "research_v1",
    executionTimestamp,
  });
  assert.match(prompt, /# Executive Summary/);
  assert.match(prompt, /primary and authoritative sources/);
  assert.match(prompt, /live search is unavailable/);
});

test("content prompt requests a finished deliverable without fake claims", () => {
  const prompt = buildSystemPrompt({
    agent,
    promptKey: "content_v1",
    executionTimestamp,
  });
  assert.match(prompt, /Deliver the finished content directly/);
  assert.match(prompt, /Do not wrap it in a generic research report/);
  assert.match(prompt, /unsupported statistics/);
});

test("web scraper prompt requires structured, traceable extraction", () => {
  const prompt = buildSystemPrompt({
    agent,
    promptKey: "web_scraper_v1",
    executionTimestamp,
  });
  assert.match(prompt, /# Extracted Data/);
  assert.match(prompt, /Markdown table/);
  assert.match(prompt, /Missing or Unverified Fields/);
});

test("web monitoring prompt establishes a sourced baseline", () => {
  const prompt = buildSystemPrompt({
    agent,
    promptKey: "web_monitoring_v1",
    executionTimestamp,
  });
  assert.match(prompt, /# Monitoring Snapshot/);
  assert.match(prompt, /establishes a baseline/);
  assert.match(prompt, /previous verified value/);
});

test("crypto prompt separates observations from analysis and risk", () => {
  const prompt = buildSystemPrompt({
    agent,
    promptKey: "crypto_research_v1",
    executionTimestamp,
  });
  assert.match(prompt, /# Market Snapshot/);
  assert.match(prompt, /Separate observed data from interpretation/);
  assert.match(prompt, /Do not give personalized financial advice/);
});

test("each approved agent has a repeatable evaluation case", () => {
  assert.equal(AGENT_EVALUATION_CASES.length, 5);
  assert.equal(
    new Set(AGENT_EVALUATION_CASES.map((item) => item.promptKey)).size,
    5
  );
  for (const item of AGENT_EVALUATION_CASES) {
    assert.ok(item.instructions.length >= 40);
    assert.ok(item.expectations.length >= 3);
  }
});
