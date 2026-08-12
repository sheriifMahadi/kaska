import { NextResponse } from "next/server";

import { internalWorkerAuthorized } from "./internal-worker-auth";
import type { BatchResult } from "./process-batches";
import {
  followupDeduplicationId,
  wakeWorkerSafely,
  type WorkerRole,
} from "./qstash";

type Followup = WorkerRole | Readonly<{
  role: WorkerRole;
  delaySeconds?: number;
  notBefore?: Date;
  reconciliation?: boolean;
}>;

export type WorkerInvocation = Readonly<{
  reconciliation: boolean;
}>;

export function workerRoute(
  role: WorkerRole,
  processBatch: (invocation: WorkerInvocation) => Promise<BatchResult>,
  followups: (result: BatchResult) => readonly Followup[] = () => []
) {
  return async function POST(request: Request) {
    const body = await request.text();
    if (!await internalWorkerAuthorized(request, body)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      let message: { reconciliation?: boolean } = {};
      try {
        message = body ? JSON.parse(body) : {};
      } catch {
        // Authentication already covers the raw body; an empty/default payload
        // remains valid for local operational calls.
      }
      const result = await processBatch({
        reconciliation: message.reconciliation === true,
      });
      for (const followup of followups(result)) {
        const followupRole = typeof followup === "string"
          ? followup
          : followup.role;
        const delaySeconds = typeof followup === "string"
          ? followup === "payments" ? 5 : 1
          : followup.delaySeconds;
        await wakeWorkerSafely(followupRole, {
          delaySeconds,
          notBefore: typeof followup === "string"
            ? undefined
            : followup.notBefore,
          reconciliation: typeof followup === "string"
            ? false
            : followup.reconciliation,
          deduplicationId:
            typeof followup !== "string" && followup.notBefore
              ? `kaska-${followupRole}-next-${followup.notBefore.toISOString()}`
              : followupDeduplicationId(followupRole),
        });
      }
      return NextResponse.json({ role, status: "completed", result });
    } catch (error) {
      console.error(`Serverless ${role} batch failed`, error);
      return NextResponse.json(
        { role, status: "failed", error: "Worker batch failed" },
        { status: 500 }
      );
    }
  };
}
