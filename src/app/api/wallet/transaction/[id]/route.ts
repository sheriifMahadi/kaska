import { NextResponse } from "next/server";

import { circle } from "@/lib/circle";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  req: Request,
  { params }: Props
) {
  const { id } = await params;

  try {
    const tx = await circle.getTransaction({
      id,
    });

    return NextResponse.json(tx.data);
  } catch {
    return NextResponse.json(
      {
        error: "Transaction not found",
      },
      {
        status: 404,
      }
    );
  }
}