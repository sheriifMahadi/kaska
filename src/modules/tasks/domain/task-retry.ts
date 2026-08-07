export const TASK_RETRY_DELAYS_MS = [5_000, 30_000, 120_000] as const;

export type TaskRetryDecision =
  | { retry: false; delayMs: null }
  | { retry: true; delayMs: number };

export function decideTaskRetry(
  retryable: boolean,
  attemptNumber: number,
  maxAttempts: number
): TaskRetryDecision {
  if (!retryable || attemptNumber >= maxAttempts) {
    return { retry: false, delayMs: null };
  }

  const delayIndex = Math.min(
    Math.max(attemptNumber - 1, 0),
    TASK_RETRY_DELAYS_MS.length - 1
  );
  return { retry: true, delayMs: TASK_RETRY_DELAYS_MS[delayIndex] };
}

export function nextTaskAttemptAt(now: Date, delayMs: number) {
  return new Date(now.getTime() + delayMs);
}
