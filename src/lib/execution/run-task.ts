import { executeTask } from "./task-executor"
/**
 * SINGLE ENTRY POINT FOR ALL TASK EXECUTION
 *
 * This is the ONLY function the rest of the app should call.
 * Later we replace internals with queue/worker system WITHOUT
 * touching API routes.
 */
export async function runTask(taskId: string) {
  try {
    // future hooks will go here:
    // - queue system
    // - rate limiting
    // - retry policy
    // - analytics tracking

    const result = await executeTask(taskId);

    return result;
  } catch (error) {
    console.error("[runTask ERROR]", {
      taskId,
      error,
    });

    throw error;
  }
}