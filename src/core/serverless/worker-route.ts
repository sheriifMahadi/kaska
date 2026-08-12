import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

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
  correlationId: string;
}>;

function workerLog(
  event: string,
  details: Readonly<Record<string, unknown>>
) {
  console.info(JSON.stringify({
    scope: "serverless-worker",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }));
}

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

    let correlationId = request.headers.get("upstash-message-id")
      || randomUUID();
    const startedAt = Date.now();
    try {
      let message: { reconciliation?: boolean; correlationId?: string } = {};
      try {
        message = body ? JSON.parse(body) : {};
      } catch {
        // Authentication already covers the raw body; an empty/default payload
        // remains valid for local operational calls.
      }
      correlationId = message.correlationId || correlationId;
      workerLog("batch.started", {
        role,
        correlationId,
        reconciliation: message.reconciliation === true,
      });
      const result = await processBatch({
        reconciliation: message.reconciliation === true,
        correlationId,
      });
      for (const followup of followups(result)) {
        const followupRole = typeof followup === "string"
          ? followup
          : followup.role;
        const delaySeconds = typeof followup === "string"
          ? followup === "payments" ? 5 : 1
          : followup.delaySeconds;
        const wake = await wakeWorkerSafely(followupRole, {
          delaySeconds,
          notBefore: typeof followup === "string"
            ? undefined
            : followup.notBefore,
          reconciliation: typeof followup === "string"
            ? false
            : followup.reconciliation,
          correlationId,
          deduplicationId:
            typeof followup !== "string" && followup.notBefore
              ? `kaska-${followupRole}-next-${followup.notBefore.toISOString()}`
              : followupDeduplicationId(followupRole),
        });
        workerLog("followup.requested", {
          role,
          followupRole,
          correlationId,
          queued: wake.queued,
        });
        // The completed database batch is idempotent. Returning an error here
        // asks QStash to retry the invocation when it could not persist the
        // next workflow message, instead of silently waiting for the slower
        // reconciliation schedule.
        if (!wake.queued && wake.reason === "publish_failed") {
          throw new Error(
            `Could not persist the ${followupRole} worker follow-up`
          );
        }
      }
      workerLog("batch.completed", {
        role,
        correlationId,
        durationMs: Date.now() - startedAt,
        result,
      });
      return NextResponse.json({
        role,
        status: "completed",
        correlationId,
        result,
      });
    } catch (error) {
      console.error(JSON.stringify({
        scope: "serverless-worker",
        event: "batch.failed",
        role,
        correlationId,
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }));
      return NextResponse.json(
        {
          role,
          status: "failed",
          correlationId,
          error: "Worker batch failed",
        },
        { status: 500 }
      );
    }
  };
}
