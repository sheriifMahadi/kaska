import { randomUUID } from "node:crypto";
import { keccak256, stringToHex } from "viem";

import {
  taskPaymentAttempts,
  taskPayments,
  tasks,
  walletLocks,
} from "@/db/schema";
import { db } from "@/lib/db";
import type { TaskPriority } from "@/modules/tasks/domain/task-status";

export type DatabaseTransaction =
  Parameters<Parameters<typeof db.transaction>[0]>[0];

type PersistPaidTaskInput = {
  userId: string;
  userAgentId: string;
  walletId: string;
  title: string;
  prompt: string;
  priority: TaskPriority;
  price: string;
  recurringJobId?: string;
  scheduledFor?: Date;
};

export async function persistPaidTask(
  transaction: DatabaseTransaction,
  input: PersistPaidTaskInput
) {
  const taskId = randomUUID();
  const escrowId = keccak256(stringToHex(taskId));
  const [task] = await transaction.insert(tasks).values({
    id: taskId,
    userId: input.userId,
    userAgentId: input.userAgentId,
    recurringJobId: input.recurringJobId,
    scheduledFor: input.scheduledFor,
    escrowTaskId: escrowId,
    title: input.title,
    prompt: input.prompt,
    priority: input.priority,
    status: "draft",
  }).returning();

  const approvalIdempotencyKey = randomUUID();
  const escrowIdempotencyKey = randomUUID();
  const settlementIdempotencyKey = randomUUID();
  const [payment] = await transaction.insert(taskPayments).values({
    taskId,
    walletId: input.walletId,
    escrowId,
    amount: input.price,
    status: "approval_pending",
    approvalIdempotencyKey,
    escrowIdempotencyKey,
    settlementIdempotencyKey,
  }).returning({ id: taskPayments.id });

  await transaction.insert(taskPaymentAttempts).values([
    {
      taskPaymentId: payment.id,
      taskId,
      kind: "approval",
      idempotencyKey: approvalIdempotencyKey,
      provider: "circle",
    },
    {
      taskPaymentId: payment.id,
      taskId,
      kind: "escrow",
      idempotencyKey: escrowIdempotencyKey,
      provider: "circle",
    },
  ]);

  await transaction.insert(walletLocks).values({
    walletId: input.walletId,
    taskId,
    escrowTaskId: escrowId,
    amount: input.price,
    status: "RESERVED",
  });

  return task;
}
