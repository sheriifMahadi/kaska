import { NextResponse } from "next/server";
import { requireCurrentUser } from
  "@/modules/identity/application/current-user";
import { createPaidTask } from
  "@/modules/tasks/application/create-paid-task";
import { listUserTasks } from
  "@/modules/tasks/application/list-user-tasks";
import { parseCreateTaskInput } from
  "@/modules/tasks/application/parse-create-task";
import { errorResponse } from
  "@/shared/http/error-response";

/* --------------------------------------------------
   GET: Fetch User Tasks
-------------------------------------------------- */
export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(
      await listUserTasks(user.id)
    );
  } catch (error) {
    return errorResponse(error, "GET /api/tasks");
  }
}

/* --------------------------------------------------
   POST: Create Task
-------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser();
    const input = parseCreateTaskInput(await req.json());
    const result = await createPaidTask(user.id, input);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error, "POST /api/tasks");
  }
}
