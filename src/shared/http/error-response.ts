import { NextResponse } from "next/server";
import { ApplicationError } from "@/shared/errors/application-error";

export function errorResponse(
  error: unknown,
  context: string
) {
  if (error instanceof ApplicationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status }
    );
  }

  console.error(context, error);

  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

