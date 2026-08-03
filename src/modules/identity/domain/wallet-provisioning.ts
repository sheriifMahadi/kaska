export const WALLET_PROVISIONING_STATUSES = [
  "pending",
  "active",
  "failed",
] as const;

export type WalletProvisioningStatus =
  (typeof WALLET_PROVISIONING_STATUSES)[number];

export const USER_STATUSES = ["active", "deleted"] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const WEBHOOK_PROCESSING_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export type WebhookProcessingStatus =
  (typeof WEBHOOK_PROCESSING_STATUSES)[number];

export const SECURITY_EVENT_OUTCOMES = [
  "success",
  "failure",
] as const;

export type SecurityEventOutcome =
  (typeof SECURITY_EVENT_OUTCOMES)[number];
