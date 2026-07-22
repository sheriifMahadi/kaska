import { processQueue } from "./process-queue";

let processing = false;

export async function enqueueTask() {
  if (processing) {
    return;
  }

  processing = true;

  try {
    await processQueue();
  } finally {
    processing = false;
  }
}