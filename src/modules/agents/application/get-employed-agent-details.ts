import "server-only";

import { listUserTasks } from "@/modules/tasks/application/list-user-tasks";
import { listEmployedAgents } from "./list-employed-agents";
import { listRecurringJobs } from "@/modules/schedules/application/recurring-jobs";

export async function getEmployedAgentDetails(
  userId: string,
  employmentId: string
) {
  const [employments, tasks, schedules] = await Promise.all([
    listEmployedAgents(userId),
    listUserTasks(userId),
    listRecurringJobs(userId),
  ]);
  const agent = employments.find(
    (employment) => employment.userAgentId === employmentId
  );
  if (!agent) return null;

  return {
    agent,
    tasks: tasks.filter((task) => task.userAgentId === employmentId),
    schedules: schedules.filter(
      (schedule) => schedule.userAgentId === employmentId
    ),
  };
}
