import "server-only";

import { listUserTasks } from "@/modules/tasks/application/list-user-tasks";
import { listEmployedAgents } from "./list-employed-agents";

export async function getEmployedAgentDetails(
  userId: string,
  employmentId: string
) {
  const [employments, tasks] = await Promise.all([
    listEmployedAgents(userId),
    listUserTasks(userId),
  ]);
  const agent = employments.find(
    (employment) => employment.userAgentId === employmentId
  );
  if (!agent) return null;

  return {
    agent,
    tasks: tasks.filter((task) => task.userAgentId === employmentId),
  };
}
