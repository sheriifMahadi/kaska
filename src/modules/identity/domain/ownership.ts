import { forbidden } from "@/shared/errors/application-error";

export function assertResourceOwner(
  currentUserId: string,
  resourceUserId: string
) {
  if (currentUserId !== resourceUserId) {
    throw forbidden("Resource does not belong to this user");
  }
}
