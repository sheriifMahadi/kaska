import { openrouter } from "@/lib/openrouter";
import {
  AIProvider,
  ExecutionRequest,
  ExecutionResult,
} from "./ai-provider";
import { buildOpenRouterRequest } from "./openrouter-request";

type OpenRouterUsage = {
  server_tool_use?: { web_search_requests?: number };
};

export class OpenRouterProvider implements AIProvider {
  readonly name = "openrouter" as const;

  async execute(
    request: ExecutionRequest
  ): Promise<ExecutionResult> {
    const response = await openrouter.chat.completions.create(
      buildOpenRouterRequest(request) as never,
      { signal: AbortSignal.timeout(request.timeoutMs) }
    );
    const message = response.choices[0]?.message;
    const citations = (message?.annotations ?? []).map((annotation) => ({
      title: annotation.url_citation.title,
      url: annotation.url_citation.url,
    }));
    const reportedWebSearchRequests =
      (response.usage as OpenRouterUsage | undefined)?.server_tool_use
        ?.web_search_requests ?? 0;
    // The compatibility web plugin always searches once but older response
    // shapes may omit server_tool_use. Its standardized URL citations are the
    // durable evidence that grounded web context was returned.
    const webSearchRequests = reportedWebSearchRequests > 0
      ? reportedWebSearchRequests
      : citations.length > 0
        ? 1
        : 0;
    const output = appendCitations(
      message?.content ?? "No response generated.",
      citations
    );

    return {
      output,
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
      cost: null,
      finishReason: response.choices[0]?.finish_reason ?? null,
      usedTools: webSearchRequests > 0 ? ["web_search"] : [],
      webSearchRequests,
      citations,
    };
  }
}

function appendCitations(
  output: string,
  citations: Array<{ title: string; url: string }>
) {
  const missing = citations.filter((citation, index) =>
    citations.findIndex((candidate) => candidate.url === citation.url) === index &&
    !output.includes(citation.url)
  );
  if (missing.length === 0) return output;
  return `${output.trim()}\n\n## Retrieved citations\n${missing
    .map((citation) => `- [${citation.title || citation.url}](${citation.url})`)
    .join("\n")}`;
}
