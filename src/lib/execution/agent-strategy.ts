export function generateAgentOutput(
  agentType: string,
  input: string
) {
  switch (agentType) {
    case "research":
      return generateResearchOutput(input);

    case "content":
      return generateContentOutput(input);

    case "seo":
      return generateSEOOutput(input);

    case "social":
      return generateSocialOutput(input);

    default:
      return generateGenericOutput(input);
  }
}

/* -------------------------
   RESEARCH AGENT
-------------------------- */
function generateResearchOutput(input: string) {
  return `
🔍 RESEARCH RESULT

Query:
${input}

Summary:
- Key insights extracted
- Information structured
- Sources would be analyzed here (future)

Confidence: High
Type: research-agent-output
`;
}

/* -------------------------
   CONTENT AGENT
-------------------------- */
function generateContentOutput(input: string) {
  return `
✍️ CONTENT RESULT

Topic:
${input}

Article:
This is a structured article generated from your request.

- Introduction
- Main points
- Conclusion

Type: content-agent-output
`;
}

/* -------------------------
   SEO AGENT
-------------------------- */
function generateSEOOutput(input: string) {
  return `
📈 SEO RESULT

Input:
${input}

- Keywords extracted
- Title optimized
- Meta description suggested
- Structure improved

Type: seo-agent-output
`;
}

/* -------------------------
   SOCIAL AGENT
-------------------------- */
function generateSocialOutput(input: string) {
  return `
📣 SOCIAL RESULT

Post:
${input}

- Engaging caption generated
- Hashtags suggested
- Tone optimized

Type: social-agent-output
`;
}

/* -------------------------
   DEFAULT
-------------------------- */
function generateGenericOutput(input: string) {
  return `
🤖 GENERIC OUTPUT

Input:
${input}

Processed successfully by Kaska engine.

Type: generic-agent-output
`;
}